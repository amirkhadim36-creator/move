
import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { Navbar } from './components/Navbar';
import { BloggerPanel } from './components/BloggerPanel';
import { CinematicLab } from './components/CinematicLab';
import { MovieCard } from './components/MovieCard';
import { ReviewModal } from './components/ReviewModal';
import { Movie, AIPost, TrendingTopic } from './types';
import { tmdbService } from './services/tmdbService';
import { geminiService } from './services/geminiService';
import { supabase } from './lib/supabase';
import { useMovieStore } from './store';

type ActiveTab = 'blogger' | 'lab';

const App: React.FC = () => {
  const movies = useMovieStore(s => s.movies);
  const aiPosts = useMovieStore(s => s.aiPosts);
  const trendingTopics = useMovieStore(s => s.trendingTopics);
  const searchQuery = useMovieStore(s => s.searchQuery);
  const selectedGenre = useMovieStore(s => s.selectedGenre);
  const isLoading = useMovieStore(s => s.isLoading);
  const page = useMovieStore(s => s.page);
  const isBloggerActive = useMovieStore(s => s.isBloggerActive);
  const status = useMovieStore(s => s.status);
  const progress = useMovieStore(s => s.progress);

  const setMovies = useMovieStore(s => s.setMovies);
  const setAiPosts = useMovieStore(s => s.setAiPosts);
  const setTrendingTopics = useMovieStore(s => s.setTrendingTopics);
  const setSearchQuery = useMovieStore(s => s.setSearchQuery);
  const setSelectedGenre = useMovieStore(s => s.setSelectedGenre);
  const setIsLoading = useMovieStore(s => s.setIsLoading);
  const setPage = useMovieStore(s => s.setPage);
  const setIsBloggerActive = useMovieStore(s => s.setIsBloggerActive);
  const setStatus = useMovieStore(s => s.setStatus);
  const setProgress = useMovieStore(s => s.setProgress);
  
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('blogger');
  const [hasError, setHasError] = useState(false);
  const [lastAttemptedMovie, setLastAttemptedMovie] = useState<Movie | null>(null);
  const [selectedPost, setSelectedPost] = useState<AIPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingModal, setIsGeneratingModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const observerTarget = useRef<HTMLDivElement>(null);
  const autoPilotInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

  const fetchAiPosts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('movie_blogs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      
      const postsWithFlag = (data || []).map(p => ({ ...p, is_ai: true }));
      setAiPosts(postsWithFlag);
    } catch (error) {
      console.error('Supabase Fetch Error:', error);
    }
  }, [setAiPosts]);

  const fetchMovies = useCallback(async (pageNum = 1, reset = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    
    try {
      // Use the updated service method which handles name to ID mapping internally
      const results = await tmdbService.getMoviesByGenre(selectedGenre, pageNum);

      if (pageNum === 1 || reset) {
        setMovies(results);
      } else {
        setMovies(prev => [...prev, ...results]);
      }
    } catch (err) {
      console.error('Fetch Movies Error:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [setMovies, setIsLoading, selectedGenre]);

  const fetchTopics = useCallback(async () => {
    const topics = await tmdbService.getTrendingTopics();
    setTrendingTopics(topics);
  }, [setTrendingTopics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await Promise.all([fetchAiPosts(), fetchMovies(1, true), fetchTopics()]);
    setRefreshing(false);
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setIsLoading(true);
    const results = await tmdbService.searchMovies(query);
    setMovies(results);
    setIsLoading(false);
  }, [setMovies, setIsLoading]);

  // Clean trigger for category changes - Atomic clear and fetch
  useEffect(() => {
    if (searchQuery.trim()) return;
    setMovies([]); // Immediate UI clear for snappier feel
    fetchMovies(1, true);
  }, [selectedGenre]);

  // Handle Search and Pagination triggers separately for clarity
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else if (page > 1) {
      fetchMovies(page, false);
    }
  }, [searchQuery, handleSearch, page]);

  useEffect(() => {
    fetchAiPosts();
    fetchTopics();
  }, [fetchAiPosts, fetchTopics]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && !isLoading && !searchQuery.trim() && !isFetchingRef.current) {
      setPage(prev => typeof prev === 'function' ? (prev as any)(page) : page + 1);
    }
  }, [isLoading, searchQuery, page, setPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { 
      threshold: 0.1,
      rootMargin: '100px'
    });
    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
      observer.disconnect();
    };
  }, [handleObserver]);

  const runGeneration = useCallback(async (isManual: boolean = false) => {
    if (!isManual && !isBloggerActive) return;

    setHasError(false);
    setStatus(isManual ? "Manual sync initiated..." : "Auto-pilot scanning...");
    setProgress(10);
    
    try {
      let currentTopics = trendingTopics;
      if (currentTopics.length === 0) {
        currentTopics = await tmdbService.getTrendingTopics();
        setTrendingTopics(currentTopics);
      }

      const alreadyBloggedIds = new Set(aiPosts.map(p => p.tmdb_id));
      const freshTopics = currentTopics.filter(t => !alreadyBloggedIds.has(t.id));

      if (freshTopics.length === 0) {
        setStatus("ARCHIVE_COMPLETE: All trending topics recorded.");
        setProgress(100);
        setTimeout(() => setProgress(0), 2000);
        return;
      }

      const selectedTopic = freshTopics[Math.floor(Math.random() * freshTopics.length)];
      const tmdbRating = selectedTopic.rating || 7.0;
      
      setStatus(`Processing: ${selectedTopic.title}...`);
      setProgress(25);
      const details = await tmdbService.getMovieDetails(selectedTopic.id);

      setStatus(`Writing deep-dive review...`);
      setProgress(50);
      const post = await geminiService.generateMovieReview(selectedTopic.title, selectedTopic.id, tmdbRating, details);
      
      setStatus("Finalizing record...");
      setProgress(80);

      const imagePath = details.backdrop_path || details.poster_path || selectedTopic.backdrop_path || selectedTopic.poster_path;
      const imageUrl = imagePath ? `https://image.tmdb.org/t/p/w1280${imagePath}` : `https://image.tmdb.org/t/p/original/${selectedTopic.id % 1000}`;

      const payload = {
        tmdb_id: selectedTopic.id,
        title: post.title,
        content: post.content,
        preview: post.preview,
        image: imageUrl, 
        sentiment: Math.round(tmdbRating * 10),
        category: post.category,
        keywords: post.keywords,
        timestamp: Date.now(),
        budget: post.budget,
        revenue: post.revenue,
        runtime: post.runtime,
        status: post.status,
        tagline: post.tagline
      };

      const { data: savedPost, error: saveError } = await supabase
        .from('movie_blogs')
        .insert([payload])
        .select()
        .single();

      if (saveError) throw saveError;
      
      const finalPost = { ...(savedPost as AIPost), is_ai: true };
      setAiPosts(prev => [finalPost, ...prev]);
      setStatus(`PUBLISHED: "${selectedTopic.title}"`);
      setProgress(100);
      
      if (isManual) {
        setTimeout(() => {
          setSelectedPost(finalPost);
          setIsModalOpen(true);
          setProgress(0);
        }, 800);
      } else {
        setTimeout(() => setProgress(0), 3000);
      }
    } catch (err) {
      console.error('Generation Flow Error:', err);
      setHasError(true);
      setStatus("SYSTEM_FAULT: Protocol failed.");
      setProgress(0);
    }
  }, [isBloggerActive, trendingTopics, aiPosts, setStatus, setProgress, setTrendingTopics, setAiPosts]);

  useEffect(() => {
    if (isBloggerActive) {
      runGeneration(false);
      autoPilotInterval.current = setInterval(() => runGeneration(false), 180000);
    } else if (autoPilotInterval.current) {
      clearInterval(autoPilotInterval.current);
      autoPilotInterval.current = null;
    }
    return () => { if (autoPilotInterval.current) clearInterval(autoPilotInterval.current); };
  }, [isBloggerActive, runGeneration]);

  const handleReadAnalysis = useCallback(async (item: Movie | AIPost) => {
    if ('content' in item || (item as any).is_ai) {
      setSelectedPost(item as unknown as AIPost);
      setIsModalOpen(true);
      return;
    }

    const movie = item as Movie;
    setLastAttemptedMovie(movie);
    setStatus(`Scanning archive for "${movie.title}"...`);

    const { data: existing } = await supabase
      .from('movie_blogs')
      .select('*')
      .eq('tmdb_id', movie.id)
      .maybeSingle();
    
    if (existing) {
      setSelectedPost({ ...(existing as AIPost), is_ai: true });
      setIsModalOpen(true);
      return;
    }

    setIsGeneratingModal(true);
    setHasError(false);
    setStatus(`Harvesting metadata...`);
    
    try {
      const details = await tmdbService.getMovieDetails(movie.id);
      setStatus(`Generating report for "${movie.title}"...`);
      const generated = await geminiService.generateMovieReview(movie.title, movie.id, movie.vote_average, details);
      
      const imagePath = details.backdrop_path || details.poster_path || movie.poster_path;
      const imageUrl = imagePath ? `https://image.tmdb.org/t/p/w1280${imagePath}` : `https://image.tmdb.org/t/p/original${movie.poster_path}`;

      const payload = {
        tmdb_id: movie.id,
        title: generated.title,
        content: generated.content,
        preview: generated.preview,
        image: imageUrl,
        sentiment: Math.round(movie.vote_average * 10),
        category: generated.category,
        keywords: generated.keywords,
        timestamp: Date.now(),
        budget: generated.budget,
        revenue: generated.revenue,
        runtime: generated.runtime,
        status: generated.status,
        tagline: generated.tagline
      };
      
      const { data: savedPost, error: saveError } = await supabase.from('movie_blogs').insert([payload]).select().single();
      if (saveError) throw saveError;

      const finalPost = { ...(savedPost as AIPost), is_ai: true };
      setAiPosts(prev => [finalPost, ...prev]);
      setSelectedPost(finalPost);
      setIsModalOpen(true);
      setIsGeneratingModal(false);
    } catch (err) {
      console.error("Manual Synthesis Error:", err);
      setHasError(true);
      setStatus("SYNTHESIS_ERROR: Process interrupted.");
    }
  }, [setAiPosts, setStatus]);

  const filteredItems = (() => {
    const aiLookup = new Map(aiPosts.map(post => [post.tmdb_id, post]));
    
    // Base list of merged content
    let list: (Movie | AIPost)[] = movies.map(m => aiLookup.get(m.id) || m);

    // Search Query Override (Strict local filtering for search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return list.filter(item => {
        const title = ('title' in item ? item.title : '').toLowerCase();
        const description = ('overview' in item ? item.overview : ('preview' in item ? item.preview : '')).toLowerCase();
        return title.includes(query) || description.includes(query);
      });
    }

    // Prepend AI Posts for specific category at the start of the feed
    if (page === 1) {
      const movieIdsInList = new Set(movies.map(m => m.id));
      const applicableAiPosts = aiPosts.filter(p => {
        const matchesGenre = selectedGenre === 'All' || p.category?.toLowerCase() === selectedGenre.toLowerCase();
        return matchesGenre && !movieIdsInList.has(p.tmdb_id);
      });
      
      list = [...applicableAiPosts.slice(0, 4), ...list];
    }

    return list;
  })();

  return (
    <div className="min-h-screen pb-20 relative bg-slate-950 selection:bg-yellow-500 selection:text-black pt-[130px] md:pt-[150px]">
      {isGeneratingModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 mb-8 relative">
             <div className="absolute inset-0 border-4 border-yellow-500/10 rounded-full"></div>
             {!hasError && <div className="absolute inset-0 border-4 border-t-yellow-500 rounded-full animate-spin"></div>}
             <i className={`fas ${hasError ? 'fa-exclamation-triangle text-red-500' : 'fa-film text-yellow-500'} absolute inset-0 flex items-center justify-center text-3xl`}></i>
          </div>
          <h3 className={`text-xl font-black mb-2 uppercase tracking-widest ${hasError ? 'text-red-500' : 'text-white'}`}>
            {hasError ? 'Process Failed' : 'Fetching Analysis'}
          </h3>
          <p className={`text-[10px] font-mono mb-8 max-w-sm uppercase tracking-[0.3em] ${hasError ? 'text-white/60' : 'text-yellow-500'}`}>{status}</p>
          
          <div className="flex gap-4">
            {hasError && (
              <button 
                onClick={() => lastAttemptedMovie && handleReadAnalysis(lastAttemptedMovie)}
                className="px-8 py-3 bg-yellow-500 text-black rounded-xl font-black text-[10px] uppercase hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-2xl"
              >
                <i className="fas fa-redo"></i> Retry
              </button>
            )}
            <button 
              onClick={() => { setIsGeneratingModal(false); setHasError(false); }}
              className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${hasError ? 'bg-white/10 text-white hover:bg-white/20' : 'text-white/40 hover:text-white'}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Navbar 
        onTogglePanel={() => setIsPanelOpen(!isPanelOpen)} 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
        isLoading={isLoading}
      />
      
      <div className="container mx-auto px-4 sm:px-6">
        <div className="md:hidden flex justify-end mb-4">
           <button 
             onClick={handleRefresh}
             className={`p-3 glass rounded-xl text-yellow-500 border-yellow-500/20 ${refreshing ? 'animate-spin' : ''}`}
           >
             <i className="fas fa-sync-alt"></i>
           </button>
        </div>

        {isPanelOpen && (
          <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => setActiveTab('blogger')}
                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border transition-all ${activeTab === 'blogger' ? 'bg-yellow-500 text-black border-yellow-400 shadow-xl' : 'bg-white/5 text-white/40 border-white/5'}`}
              >
                <i className="fas fa-pen-nib mr-2"></i> Editorial Console
              </button>
              <button 
                onClick={() => setActiveTab('lab')}
                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border transition-all ${activeTab === 'lab' ? 'bg-yellow-500 text-black border-yellow-400 shadow-xl' : 'bg-white/5 text-white/40 border-white/5'}`}
              >
                <i className="fas fa-clapperboard mr-2"></i> Vision Lab
              </button>
            </div>
            
            {activeTab === 'blogger' ? (
              <BloggerPanel 
                isOpen={true}
                isBloggerActive={isBloggerActive}
                onStart={() => setIsBloggerActive(true)}
                onStop={() => setIsBloggerActive(false)}
                onManualGenerate={() => runGeneration(true)}
                status={status}
                progress={progress}
                trendingTopics={trendingTopics}
                hasError={hasError}
              />
            ) : (
              <CinematicLab />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {filteredItems.map((item) => {
            const isAI = 'is_ai' in item || 'content' in item;
            const key = isAI ? `ai-${item.id}` : `tmdb-${(item as Movie).id}`;
            return (
              <MovieCard 
                key={key} 
                item={item} 
                isAI={isAI}
                onReadAnalysis={handleReadAnalysis}
              />
            );
          })}
          
          {isLoading && movies.length === 0 && Array.from({ length: 8 }).map((_, i) => (
            <div key={`skel-${i}`} className="aspect-[2/3] glass rounded-[2rem] animate-pulse overflow-hidden flex flex-col justify-end p-6 border border-white/5">
                <div className="w-12 h-6 bg-slate-800 rounded-lg mb-4"></div>
                <div className="w-full h-8 bg-slate-800 rounded-lg mb-4"></div>
                <div className="w-3/4 h-4 bg-slate-800 rounded-lg mb-2"></div>
                <div className="w-1/2 h-4 bg-slate-800 rounded-lg"></div>
            </div>
          ))}

          {filteredItems.length === 0 && !isLoading && (
            <div className="col-span-full py-20 text-center animate-in zoom-in-90 duration-300">
              <i className="fas fa-search-minus text-4xl text-slate-700 mb-4"></i>
              <p className="text-slate-500 font-bold uppercase tracking-widest">No matching records found</p>
            </div>
          )}
        </div>

        <div ref={observerTarget} className="h-48 flex items-center justify-center mt-12 relative overflow-hidden group">
          {isLoading && movies.length > 0 && (
            <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
              <div className="flex items-center gap-4 px-6 py-3 glass rounded-2xl border-white/5">
                <div className="w-6 h-6 border-2 border-white/5 border-t-yellow-500 rounded-full animate-spin"></div>
                <span className="text-[10px] font-black tracking-[0.4em] uppercase text-white/80">Loading Archives</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReviewModal 
        isOpen={isModalOpen} 
        post={selectedPost} 
        onClose={() => setIsModalOpen(false)} 
      />

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="glass w-12 h-12 rounded-full text-white/50 hover:text-yellow-500 transition-all shadow-2xl border-white/10 flex items-center justify-center group backdrop-blur-3xl"
        >
          <i className="fas fa-chevron-up group-hover:-translate-y-1 transition-transform"></i>
        </button>
      </div>
    </div>
  );
};

export default App;
