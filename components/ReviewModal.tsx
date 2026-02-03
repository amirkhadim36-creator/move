
import React, { useState, useEffect, useRef } from 'react';
import { AIPost } from '../types';
import { geminiService } from '../services/geminiService';
import { tmdbService, MovieVideo } from '../services/tmdbService';
import { supabase } from '../lib/supabase';

interface ReviewModalProps {
  post: AIPost | null;
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'up' | 'down' | null;

export const ReviewModal: React.FC<ReviewModalProps> = ({ post, isOpen, onClose }) => {
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [videos, setVideos] = useState<MovieVideo[]>([]);
  const [activeVideoKey, setActiveVideoKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  // TTS State
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Audio Preferences
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('movieultra_volume') ?? '0.8'));
  const [playbackSpeed, setPlaybackSpeed] = useState(() => Number(localStorage.getItem('movieultra_speed') ?? '1'));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (post && isOpen) {
      const storedFeedback = localStorage.getItem(`movieultra_feedback_${post.id}`);
      setFeedback(storedFeedback as FeedbackType);
      setVideoError(false);
      
      // Fetch Trailers
      const fetchVideos = async () => {
        const fetchedVideos = await tmdbService.getMovieVideos(post.tmdb_id);
        setVideos(fetchedVideos);
        
        // Refined Video Selection Logic:
        // Filter for Trailers on YouTube and sort by published_at (most recent first)
        const trailers = fetchedVideos
          .filter(v => v.type === 'Trailer' && v.site === 'YouTube')
          .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
        
        if (trailers.length > 0) {
          setActiveVideoKey(trailers[0].key);
        } else if (fetchedVideos.length > 0 && fetchedVideos[0].site === 'YouTube') {
          // Fallback to first available YouTube video if no trailer
          setActiveVideoKey(fetchedVideos[0].key);
        } else {
          setActiveVideoKey(null);
        }
      };
      fetchVideos();
      setIsExpanded(false);
    } else {
      setVideos([]);
      setActiveVideoKey(null);
      setVideoError(false);
    }
  }, [post, isOpen]);

  // Sync Audio Preferences to localStorage and Live Nodes
  useEffect(() => {
    localStorage.setItem('movieultra_volume', volume.toString());
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(volume, audioContextRef.current.currentTime, 0.1);
    }
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('movieultra_speed', playbackSpeed.toString());
    if (sourceNodeRef.current && audioContextRef.current) {
      sourceNodeRef.current.playbackRate.setTargetAtTime(playbackSpeed, audioContextRef.current.currentTime, 0.1);
    }
  }, [playbackSpeed]);

  const handleClose = () => {
    stopAudio();
    onClose();
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
    }
    gainNodeRef.current = null;
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const handleListen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (!post) return;
    
    setIsSynthesizing(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      let audioBase64 = post.audio_base64;

      if (!audioBase64) {
        const cleanText = post.content.replace(/<[^>]*>?/gm, ' ');
        const ttsText = `${post.title}. ${post.preview}. ${cleanText.slice(0, 500)}`;
        audioBase64 = await geminiService.generateSpeech(ttsText);
        
        await supabase
          .from('movie_blogs')
          .update({ audio_base64: audioBase64 })
          .eq('id', post.id);
          
        post.audio_base64 = audioBase64;
      }

      const buffer = await geminiService.decodeAudio(audioBase64, audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();

      source.buffer = buffer;
      source.playbackRate.value = playbackSpeed;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
        sourceNodeRef.current = null;
        gainNodeRef.current = null;
      };

      const startTime = audioContextRef.current.currentTime;
      source.start(0);
      sourceNodeRef.current = source;
      gainNodeRef.current = gainNode;
      setIsPlaying(true);
      
      const progressInterval = setInterval(() => {
        if (!sourceNodeRef.current || !audioContextRef.current) {
          clearInterval(progressInterval);
          return;
        }
        const elapsed = audioContextRef.current.currentTime - startTime;
        const currentRate = sourceNodeRef.current.playbackRate.value;
        const totalDuration = buffer.duration / currentRate;
        const perc = (elapsed / totalDuration) * 100;
        setPlaybackProgress(Math.min(perc, 100));
        if (perc >= 100) clearInterval(progressInterval);
      }, 100);

    } catch (error) {
      console.error("Audio Playback Error:", error);
    } finally {
      setIsSynthesizing(false);
    }
  };

  if (!isOpen || !post) return null;

  const handleFeedback = (type: FeedbackType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (feedback === type) {
      localStorage.removeItem(`movieultra_feedback_${post.id}`);
      setFeedback(null);
    } else {
      localStorage.setItem(`movieultra_feedback_${post.id}`, type as string);
      setFeedback(type);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.origin + (post.tmdb_id ? `?movie=${post.tmdb_id}` : '');
    navigator.clipboard.writeText(url);
    setShareStatus('copied');
    setTimeout(() => setShareStatus('idle'), 2000);
  };

  const formatCurrency = (val?: number) => {
    if (!val || val === 0) return 'N/A';
    return `$${(val / 1000000).toFixed(1)}M`;
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-500 overflow-hidden">
      
      {/* FLOATING BACK BUTTON - REFINED STYLING */}
      <button 
        onClick={handleClose}
        className="fixed top-6 left-6 z-[150] bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 text-white/90 hover:bg-white/10 transition-all flex items-center gap-2 shadow-2xl active:scale-95"
      >
        <i className="fas fa-arrow-left text-xs"></i>
        <span className="text-[10px] font-black uppercase tracking-widest">Back to Gallery</span>
      </button>

      {/* FIXED FULL-SCREEN BLURRED POSTER BACKGROUND */}
      <div 
        className="absolute inset-0 z-0 scale-110 pointer-events-none"
        style={{ 
          backgroundImage: `url(${post.image})`, 
          backgroundPosition: 'center', 
          backgroundSize: 'cover',
          filter: 'blur(100px) brightness(0.25) saturate(1.5)' 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/95"></div>
      </div>

      {/* INDEPENDENT SCROLLING CONTAINER */}
      <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain custom-scrollbar [webkit-overflow-scrolling:touch]">
        <div className="w-full max-w-5xl mx-auto min-h-full flex flex-col pt-4 sm:pt-8 pb-24 px-4 sm:px-6">
          
          {/* HEADER CONTROLS */}
          <div className="flex items-center justify-end mb-10 sticky top-0 z-[110] py-4">
            <div className="flex gap-2">
              <button 
                onClick={handleShare}
                className={`w-12 h-12 glass rounded-full flex items-center justify-center transition-all border border-white/10 shadow-xl ${shareStatus === 'copied' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-white/50 hover:text-yellow-500'}`}
              >
                <i className={`fas ${shareStatus === 'copied' ? 'fa-check' : 'fa-share-nodes'}`}></i>
              </button>
            </div>
          </div>

          {/* MAIN CONTENT CONTAINER */}
          <div className="w-full space-y-8 animate-in slide-in-from-bottom-8 duration-700">
            
            {/* THEATER SECTION (VIDEO PLAYER) */}
            <div className="w-full aspect-video rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] border border-white/10 glass relative group">
              {activeVideoKey && !videoError ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVideoKey}?autoplay=1&modestbranding=1&rel=0&origin=${window.location.origin}`}
                  title="Movie Trailer"
                  className="w-full h-full object-cover"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  onError={handleVideoError}
                ></iframe>
              ) : (
                <div className="relative w-full h-full">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-center p-6 text-center">
                    {activeVideoKey && videoError ? (
                      <>
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mb-4 border border-white/20">
                          <i className="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>
                        </div>
                        <p className="text-white text-sm font-bold mb-4 uppercase tracking-widest">Playback Restrictive</p>
                        <a 
                          href={`https://www.youtube.com/watch?v=${activeVideoKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl flex items-center gap-2"
                        >
                          <i className="fab fa-youtube"></i> Watch on YouTube
                        </a>
                      </>
                    ) : (
                      <>
                         <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mb-4 border border-white/20">
                          <i className="fas fa-film text-white/40 text-xl"></i>
                        </div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">No Visual Stream Available</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              <div className="absolute top-6 left-6 flex gap-2">
                  <span className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xl ${activeVideoKey && !videoError ? 'bg-red-600 text-white' : 'bg-white/10 text-white/50 backdrop-blur-md'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${activeVideoKey && !videoError ? 'bg-white animate-pulse' : 'bg-white/20'}`}></span> 
                    {activeVideoKey && !videoError ? 'Theater Mode Active' : 'Cinematic Poster'}
                  </span>
              </div>
            </div>

            {/* PRIMARY INFO SECTION */}
            <div className="px-2">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                  {post.category && (
                      <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9px] font-black rounded-full uppercase tracking-widest">
                          {post.category}
                      </span>
                  )}
                  <div className="flex items-center gap-1.5">
                      <i className="fas fa-star text-yellow-500 text-[10px]"></i>
                      <span className="text-white font-black text-xs">{(post.sentiment / 10).toFixed(1)} <span className="text-white/30 text-[9px]">/ 10</span></span>
                  </div>
                  <span className="text-white/30 text-[10px] font-mono">• {post.runtime || 'N/A'} MIN</span>
                  <span className="text-white/30 text-[10px] font-mono">• {post.status || 'Released'}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter mb-4 uppercase italic leading-none">
                {post.title}
              </h1>
              
              {post.tagline && (
                <p className="text-yellow-500 text-sm md:text-lg font-bold tracking-tight mb-8 opacity-80 italic">
                  "{post.tagline}"
                </p>
              )}

              {/* EXPANDABLE DESCRIPTION */}
              <div 
                  className={`glass border border-white/5 rounded-3xl p-6 sm:p-8 transition-all duration-500 cursor-pointer hover:bg-white/[0.03] relative group ${isExpanded ? 'bg-white/[0.02]' : 'bg-white/[0.01]'}`}
                  onClick={() => setIsExpanded(!isExpanded)}
              >
                  <div className="mb-4">
                      <p className="text-white font-bold text-sm md:text-base leading-relaxed mb-4">
                          {post.preview}
                      </p>
                  </div>

                  <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="h-[1px] w-full bg-white/5 mb-8"></div>
                      <article 
                          className="prose-cinematic"
                          dangerouslySetInnerHTML={{ __html: post.content }}
                      />
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-8 border-t border-white/5">
                          <div>
                              <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Budget</p>
                              <p className="text-white text-xs font-mono">{formatCurrency(post.budget)}</p>
                          </div>
                          <div>
                              <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Revenue</p>
                              <p className="text-white text-xs font-mono">{formatCurrency(post.revenue)}</p>
                          </div>
                          <div>
                              <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Keywords</p>
                              <p className="text-white text-[9px] font-bold uppercase tracking-tighter">{post.keywords?.slice(0, 3).join(', ')}</p>
                          </div>
                          <div>
                              <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Synthesis ID</p>
                              <p className="text-white text-[9px] font-mono">{post.id.slice(0, 8)}</p>
                          </div>
                      </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                      <button className="text-[10px] font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2 transition-transform">
                          {isExpanded ? 'Show Less' : 'Show More...'}
                          <i className={`fas fa-chevron-down transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                      </button>

                      <div className="flex items-center gap-4">
                          <button onClick={(e) => handleFeedback('up', e)} className={`flex items-center gap-2 text-[10px] font-black transition-all ${feedback === 'up' ? 'text-emerald-400' : 'text-white/20 hover:text-white'}`}>
                              <i className="fas fa-thumbs-up"></i>
                          </button>
                          <button onClick={(e) => handleFeedback('down', e)} className={`flex items-center gap-2 text-[10px] font-black transition-all ${feedback === 'down' ? 'text-red-400' : 'text-white/20 hover:text-white'}`}>
                              <i className="fas fa-thumbs-down"></i>
                          </button>
                      </div>
                  </div>
              </div>

              {/* TRAILERS & EXTRAS SECTION */}
              {videos.length > 0 && (
                <div className="mt-12 space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-3">
                      <i className="fas fa-clapperboard text-yellow-500/50"></i> Trailers & Extras
                    </h3>
                    <a 
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(post.title + ' trailer')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-black text-white/20 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2"
                    >
                      Browse YouTube <i className="fas fa-external-link-alt text-[8px]"></i>
                    </a>
                  </div>
                  
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 mask-fade-right">
                    {videos.map((video) => (
                      <div 
                        key={video.key}
                        onClick={() => {
                          setActiveVideoKey(video.key);
                          setVideoError(false);
                        }}
                        className={`group relative flex-shrink-0 w-64 aspect-video rounded-2xl overflow-hidden border transition-all cursor-pointer ${
                          activeVideoKey === video.key ? 'border-yellow-500 ring-2 ring-yellow-500/20' : 'border-white/5 hover:border-white/20'
                        }`}
                      >
                        <img 
                          src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`} 
                          alt={video.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black">
                            <i className="fas fa-play text-xs"></i>
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                          <p className="text-[9px] font-black text-white truncate uppercase tracking-tighter">{video.name}</p>
                          <p className="text-[7px] text-white/50 uppercase tracking-widest">{video.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FLOATING ACTION BAR FOR NARRATOR */}
              <div className="mt-12 mb-12 flex flex-col md:flex-row items-center gap-6 p-6 glass rounded-3xl border border-white/10 shadow-2xl">
                  <div className="flex-1 w-full">
                      <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-yellow-500 animate-ping' : 'bg-white/20'}`}></div>
                              <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Cinematic Audio Protocol</span>
                          </div>
                          <div className="flex items-center gap-6">
                              <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center px-1">
                                      <label className="text-[8px] font-black text-white/30 uppercase tracking-widest">Gain</label>
                                      <span className="text-[8px] font-mono text-yellow-500/50">{Math.round(volume * 100)}%</span>
                                  </div>
                                  <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-yellow-500" />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center px-1">
                                      <label className="text-[8px] font-black text-white/30 uppercase tracking-widest">Rate</label>
                                      <span className="text-[8px] font-mono text-yellow-500/50">{playbackSpeed}x</span>
                                  </div>
                                  <input type="range" min="0.5" max="2" step="0.1" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))} className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-yellow-500" />
                              </div>
                          </div>
                      </div>
                      {isPlaying && (
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-100" style={{ width: `${playbackProgress}%` }}></div>
                          </div>
                      )}
                  </div>
                  
                  <button 
                      onClick={handleListen}
                      disabled={isSynthesizing}
                      className={`whitespace-nowrap px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${
                          isSynthesizing ? 'bg-slate-800 text-white/20' : 
                          isPlaying ? 'bg-red-500 text-white' : 
                          'bg-yellow-500 text-black hover:scale-105 active:scale-95'
                      }`}
                  >
                      {isSynthesizing ? <><i className="fas fa-circle-notch fa-spin"></i> Protocol Sync...</> : isPlaying ? <><i className="fas fa-stop"></i> Abort Sequence</> : <><i className="fas fa-play"></i> Initiate Narrative</>}
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
