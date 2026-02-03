
import React, { useState } from 'react';
import { Movie, AIPost } from '../types';
import { GENRE_MAP } from '../services/tmdbService';

interface MovieCardProps {
  item: Movie | AIPost;
  isAI?: boolean;
  onReadAnalysis: (item: Movie | AIPost) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ item, isAI = false, onReadAnalysis }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const title = 'title' in item ? item.title : '';
  
  // Image logic: Use w342 for card performance (mobile optimized), w1280 or original only in modal
  let image = "";
  if (isAI) {
    const post = item as AIPost;
    image = post.image;
    // If it's a TMDB path stored in AI post, replace size for card performance
    if (image.includes('image.tmdb.org/t/p/')) {
        image = image.replace(/\/t\/p\/(original|w1280|w780|w500)/, '/t/p/w342');
    }
  } else {
    const movie = item as Movie;
    image = movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : "";
  }

  // Rating Logic: Standardizing everything to a 10-point scale
  const displayRating = isAI 
    ? ((item as AIPost).sentiment / 10).toFixed(1) 
    : (item as Movie).vote_average?.toFixed(1);

  // Category Logic: AIPost has 'category', Movie has 'genre_ids'
  const categoryLabel = isAI 
    ? (item as AIPost).category 
    : ((item as Movie).genre_ids && (item as Movie).genre_ids![0] ? GENRE_MAP[(item as Movie).genre_ids![0]] : null);

  // Overview logic: Preview for AI posts, Overview for TMDB movies
  const overview = isAI 
    ? (item as AIPost).preview 
    : (item as Movie).overview;

  return (
    <div 
      className="relative rounded-[2rem] overflow-hidden glass animate-card aspect-[2/3] group border-slate-700/50 hover:border-yellow-500/50 transition-all duration-300 border bg-slate-900 shadow-2xl active:scale-[0.97] active:border-yellow-500 active:brightness-90 active:shadow-[0_0_30px_rgba(245,158,11,0.2)] cursor-pointer touch-manipulation select-none"
      onClick={() => onReadAnalysis(item)}
    >
      
      {/* Loading Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
           <i className="fas fa-film text-slate-700 text-3xl"></i>
        </div>
      )}

      {/* Clickable Image Area */}
      <div className="h-full w-full">
        {image ? (
          <img 
            src={image} 
            alt={title}
            className={`w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <i className="fas fa-image text-slate-700 text-3xl"></i>
          </div>
        )}
      </div>

      {/* Persistent Cinematic Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent transition-opacity duration-700 flex flex-col justify-end p-6 pointer-events-none ${isLoaded || !image ? 'opacity-100' : 'opacity-0'}`}>
        
        <div className="flex items-center justify-between mb-3">
          <span className="px-3 py-1 bg-yellow-500 text-black text-[10px] font-black rounded-lg shadow-xl flex items-center gap-1">
            <i className="fas fa-star"></i> {displayRating}
          </span>
          {categoryLabel && (
            <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-white/80 text-[8px] font-black rounded-lg uppercase tracking-widest border border-white/5">
              {categoryLabel}
            </span>
          )}
        </div>
        
        <h3 className="text-xl font-bold mb-2 line-clamp-1 text-white tracking-tight group-hover:text-yellow-500 transition-colors">{title}</h3>
        
        <p className="text-[10px] text-white/70 line-clamp-2 mb-4 leading-relaxed transition-all group-hover:line-clamp-none group-hover:mb-2 group-hover:text-white">
          {overview}
        </p>
        
        <div className="overflow-hidden">
          <div 
            className="w-full py-3 bg-white text-black rounded-xl text-[10px] font-black hover:bg-yellow-500 transition-all text-center uppercase tracking-widest pointer-events-auto md:opacity-0 md:translate-y-8 group-hover:opacity-100 group-hover:translate-y-0 duration-300 ease-out opacity-100 translate-y-0"
          >
            {isAI ? 'Read Deep-Dive' : 'Synthesize Analysis'}
          </div>
        </div>
      </div>
    </div>
  );
};
