
import React, { useState, useEffect, useRef } from 'react';
import { useMovieStore } from '../store';

interface NavbarProps {
  onTogglePanel: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onTogglePanel, 
  searchQuery, 
  onSearchChange,
  selectedGenre,
  onGenreChange,
  isLoading = false
}) => {
  const [localValue, setLocalValue] = useState(searchQuery);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  const categories = ['All', 'Action', 'Comedy', 'Horror', 'Sci-Fi', 'Drama', 'Fantasy', 'Mystery', 'Animation', 'Thriller'];

  useEffect(() => {
    setLocalValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue.trim() !== searchQuery.trim()) {
        onSearchChange(localValue);
      }
    }, 600);
    return () => clearTimeout(handler);
  }, [localValue, onSearchChange, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu: string) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  const handleGenreClick = (genre: string) => {
    setLocalValue(""); // Reset local input UI
    onSearchChange(""); // Reset global search query
    onGenreChange(genre); // Set new category
    setActiveMenu(null);
  };

  const handleCategorySearch = (query: string) => {
    onSearchChange(query);
    onGenreChange("All"); // Reset genre filter when doing specific custom search
    setActiveMenu(null);
  };

  const handleClearSearch = () => {
    setLocalValue("");
    onSearchChange("");
    onGenreChange("All");
  };

  return (
    <nav ref={navRef} className="fixed top-0 left-0 right-0 z-[9999] glass border-b border-white/5 backdrop-blur-3xl shadow-2xl">
      <div className="max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6 mb-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-yellow-500 w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer active:scale-90 transition-all" onClick={handleClearSearch}>
              <i className="fas fa-robot text-black text-xl"></i>
            </div>
            <h1 className="text-xl font-black tracking-tighter hidden lg:block uppercase italic cursor-pointer select-none" onClick={handleClearSearch}>
              MOVIE<span className="text-yellow-500">ULTRA</span>
            </h1>
          </div>

          {/* Cinematic Main Menu */}
          <ul className="hidden xl:flex items-center gap-1 text-[10px] font-black tracking-widest text-white/50">
            <li 
              className="px-4 py-2 hover:text-yellow-500 transition-all cursor-pointer flex items-center gap-2 group"
              onClick={handleClearSearch}
            >
              <span className="group-hover:scale-110 transition-transform">🏠</span> HOME
            </li>

            <li className="relative px-4 py-2 cursor-pointer group">
              <span 
                className={`flex items-center gap-2 transition-colors uppercase ${activeMenu === 'movies' ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
                onClick={() => toggleMenu('movies')}
              >
                🎬 MOVIES <i className={`fas fa-chevron-down text-[8px] transition-transform duration-300 ${activeMenu === 'movies' ? 'rotate-180' : ''}`}></i>
              </span>
              {activeMenu === 'movies' && (
                <ul className="absolute top-full left-0 mt-4 w-64 glass-strong border border-white/10 rounded-2xl p-2 shadow-2xl z-[110] animate-in fade-in slide-in-from-top-2">
                  {['South Hindi Dubbed', 'Adult Movies', 'Bollywood', 'Dual Audio', 'Hindi Dubbed', 'Hollywood'].map(item => (
                    <li 
                      key={item} 
                      className="px-4 py-3 hover:bg-yellow-500 hover:text-black rounded-xl transition-all uppercase tracking-tighter text-white font-bold text-[10px]"
                      onClick={() => handleCategorySearch(item)}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </li>

            <li 
              className="px-4 py-2 hover:text-yellow-500 transition-all cursor-pointer flex items-center gap-2"
              onClick={() => handleCategorySearch('Web Series')}
            >
              🌐 WEB SERIES
            </li>
          </ul>

          {/* Global Search & Config */}
          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="relative max-w-xs w-full ml-2">
              <input 
                type="text" 
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder="Deep search films..." 
                className="bg-slate-800/50 border border-slate-700 rounded-full pl-5 pr-12 py-2.5 w-full focus:outline-none focus:border-yellow-500 transition-all text-xs font-medium placeholder:text-white/20"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {localValue && !isLoading && (
                  <button 
                    onClick={() => { setLocalValue(''); onSearchChange(''); }}
                    className="text-white/20 hover:text-white transition-colors p-1"
                  >
                    <i className="fas fa-times text-[10px]"></i>
                  </button>
                )}
                {isLoading ? (
                  <i className="fas fa-circle-notch fa-spin text-yellow-500 text-xs"></i>
                ) : (
                  <i className="fas fa-search text-white/20 text-xs"></i>
                )}
              </div>
            </div>

            <button 
              onClick={onTogglePanel} 
              className="w-10 h-10 bg-yellow-500 rounded-full hover:rotate-90 transition-all text-black flex items-center justify-center min-w-[40px] shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-white/5 active:scale-95"
            >
              <i className="fas fa-cog text-sm"></i>
            </button>
          </div>
        </div>

        {/* Horizontal Category Pill Bar */}
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2 -mx-2 px-2 mask-fade-edges h-14">
          {categories.map((genre) => {
            const isActive = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => handleGenreClick(genre)}
                className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap border flex items-center gap-2 flex-shrink-0 ${
                  isActive 
                    ? 'bg-yellow-500 text-black border-white shadow-[0_0_30px_rgba(245,158,11,0.6)] scale-105 z-10' 
                    : 'bg-white/5 text-white/40 border-white/5 hover:text-white hover:bg-white/10 hover:border-white/20 scale-100'
                }`}
              >
                {isActive && <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></span>}
                {genre}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
