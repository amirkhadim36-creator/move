
import { create } from 'zustand';
import { Movie, AIPost, TrendingTopic } from './types';

interface MovieState {
  movies: Movie[];
  aiPosts: AIPost[];
  trendingTopics: TrendingTopic[];
  searchQuery: string;
  selectedGenre: string;
  isLoading: boolean;
  page: number;
  isBloggerActive: boolean;
  status: string;
  progress: number;
  
  setMovies: (movies: Movie[] | ((prev: Movie[]) => Movie[])) => void;
  setAiPosts: (posts: AIPost[] | ((prev: AIPost[]) => AIPost[])) => void;
  setTrendingTopics: (topics: TrendingTopic[]) => void;
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genre: string) => void;
  setIsLoading: (loading: boolean) => void;
  setPage: (page: number | ((prev: number) => number)) => void;
  setIsBloggerActive: (active: boolean) => void;
  setStatus: (status: string) => void;
  setProgress: (progress: number) => void;
  
  resetFilters: () => void;
}

export const useMovieStore = create<MovieState>((set) => ({
  movies: [],
  aiPosts: [],
  trendingTopics: [],
  searchQuery: "",
  selectedGenre: "All",
  isLoading: false,
  page: 1,
  isBloggerActive: false,
  status: "System Ready: Connection Secure.",
  progress: 0,

  setMovies: (updater) => set((state) => {
    const newMovies = typeof updater === 'function' ? updater(state.movies) : updater;
    // Automatic duplicate removal when setting/appending
    const seen = new Set();
    const unique = newMovies.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    return { movies: unique };
  }),
  setAiPosts: (updater) => set((state) => ({ 
    aiPosts: typeof updater === 'function' ? updater(state.aiPosts) : updater 
  })),
  setTrendingTopics: (topics) => set({ trendingTopics: topics }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedGenre: (genre) => set({ 
    selectedGenre: genre, 
    page: 1, 
    movies: [] // Atomic reset to prevent stale data race conditions
  }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setPage: (updater) => set((state) => ({ 
    page: typeof updater === 'function' ? updater(state.page) : updater 
  })),
  setIsBloggerActive: (active) => set({ isBloggerActive: active }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  
  resetFilters: () => set({ searchQuery: "", selectedGenre: "All", page: 1, movies: [] }),
}));
