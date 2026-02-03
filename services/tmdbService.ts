
import { Movie, TrendingTopic } from '../types';

// Source key from environment for security
const TMDB_API_KEY = process.env.TMDB_API_KEY || '72a08ef93943ef7f2719f4d0bfb1a7cf';
const BASE_URL = 'https://api.themoviedb.org/3';

export interface MovieVideo {
  name: string;
  key: string;
  site: string;
  type: string;
  published_at: string;
}

export const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller', 
  10752: 'War', 37: 'Western'
};

export const tmdbService = {
  getTrendingMovies: async (page: number = 1): Promise<Movie[]> => {
    try {
      const response = await fetch(`${BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}&page=${page}`);
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('TMDB Fetch Error:', error);
      return [];
    }
  },

  getMoviesByGenre: async (genreName: string, page: number = 1): Promise<Movie[]> => {
    try {
      if (!genreName || genreName === 'All') {
        return tmdbService.getTrendingMovies(page);
      }
      
      const genreId = Object.keys(GENRE_MAP).find(key => GENRE_MAP[Number(key)] === genreName);
      
      if (!genreId) {
        return tmdbService.getTrendingMovies(page);
      }
      
      const response = await fetch(
        `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${page}&with_genres=${genreId}&sort_by=popularity.desc`
      );
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Category Fetch Error:', error);
      return [];
    }
  },

  getMovieDetails: async (id: number): Promise<Partial<Movie> & { genre_names?: string[] }> => {
    try {
      const response = await fetch(`${BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`);
      const data = await response.json();
      return {
        budget: data.budget,
        revenue: data.revenue,
        status: data.status,
        runtime: data.runtime,
        tagline: data.tagline,
        release_date: data.release_date,
        backdrop_path: data.backdrop_path,
        poster_path: data.poster_path,
        genre_names: data.genres?.map((g: any) => g.name) || []
      };
    } catch (error) {
      console.error('TMDB Details Fetch Error:', error);
      return {};
    }
  },

  getMovieVideos: async (id: number): Promise<MovieVideo[]> => {
    try {
      const response = await fetch(`${BASE_URL}/movie/${id}/videos?api_key=${TMDB_API_KEY}`);
      const data = await response.json();
      
      // Filter results to specifically look for YouTube videos
      const youtubeVideos = (data.results || []).filter((v: any) => v.site === 'YouTube');
      
      // Look for a video of type 'Trailer'
      const trailer = youtubeVideos.find((v: any) => v.type === 'Trailer');
      
      if (trailer) {
        // Return the trailer as the first item, followed by other videos
        const others = youtubeVideos.filter((v: any) => v.key !== trailer.key);
        return [trailer, ...others];
      }
      
      // If no 'Trailer' type is found, return the YouTube videos list (the first available will be at index 0)
      return youtubeVideos;
    } catch (error) {
      console.error('TMDB Videos Fetch Error:', error);
      return [];
    }
  },
  
  searchMovies: async (query: string): Promise<Movie[]> => {
    try {
      const titleSearchResponse = await fetch(`${BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
      const titleData = await titleSearchResponse.json();
      let results: Movie[] = titleData.results || [];

      const keywordResponse = await fetch(`${BASE_URL}/search/keyword?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
      const keywordData = await keywordResponse.json();
      const topKeywords = (keywordData.results || []).slice(0, 3);

      if (topKeywords.length > 0) {
        const keywordIds = topKeywords.map((k: any) => k.id).join('|');
        const discoverResponse = await fetch(`${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_keywords=${keywordIds}&sort_by=popularity.desc`);
        const discoverData = await discoverResponse.json();
        
        if (discoverData.results) {
          const seenIds = new Set(results.map(m => m.id));
          discoverData.results.forEach((m: Movie) => {
            if (!seenIds.has(m.id)) {
              results.push(m);
              seenIds.add(m.id);
            }
          });
        }
      }

      return results;
    } catch (error) {
      console.error('TMDB Search Error:', error);
      return [];
    }
  },

  getTrendingTopics: async (): Promise<TrendingTopic[]> => {
    try {
      const response = await fetch(`${BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}`);
      const data = await response.json();
      
      return (data.results || []).slice(0, 10).map((item: any) => ({
        id: item.id,
        title: item.title || item.name,
        category: item.media_type === 'tv' ? 'Series' : 'Cinema',
        volume: item.popularity > 1500 ? 'High' : item.popularity > 800 ? 'Medium' : 'Low',
        rating: item.vote_average,
        backdrop_path: item.backdrop_path,
        poster_path: item.poster_path
      }));
    } catch (error) {
      console.error('TMDB Topics Fetch Error:', error);
      return [];
    }
  }
};
