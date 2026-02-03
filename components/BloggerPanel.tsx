
import React from 'react';
import { TrendingTopic } from '../types';

interface BloggerPanelProps {
  isOpen: boolean;
  isBloggerActive: boolean;
  onStart: () => void;
  onStop: () => void;
  onManualGenerate: () => void;
  status: string;
  progress: number;
  trendingTopics: TrendingTopic[];
  hasError?: boolean;
}

export const BloggerPanel: React.FC<BloggerPanelProps> = ({ 
  isOpen, 
  isBloggerActive, 
  onStart, 
  onStop, 
  onManualGenerate,
  status, 
  progress,
  trendingTopics,
  hasError = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="lg:col-span-1 glass p-6 rounded-3xl border-yellow-500/20 relative overflow-hidden">
        {hasError && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>}
        
        <h3 className="text-xl font-bold mb-4 text-yellow-500 flex items-center gap-2">
          <i className="fas fa-magic"></i> AI Blogger Settings
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm opacity-60">Generation Frequency</label>
            <select className="w-full bg-slate-800 p-3 rounded-xl mt-1 border border-slate-700 focus:border-yellow-500 outline-none">
              <option value="daily">Daily (1 Post)</option>
              <option value="twice">Twice Daily</option>
              <option value="realtime">Real-time Surge</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {!isBloggerActive ? (
              <button 
                onClick={onStart}
                className="btn-gradient py-3 rounded-xl font-bold text-black flex items-center justify-center gap-2 hover:opacity-90 transition-all text-xs"
              >
                <i className="fas fa-play"></i> Auto-Pilot
              </button>
            ) : (
              <button 
                onClick={onStop}
                className="bg-red-500/20 text-red-500 py-3 rounded-xl font-bold border border-red-500/50 flex items-center justify-center gap-2 hover:bg-red-500/30 transition-all text-xs"
              >
                <i className="fas fa-stop"></i> Stop
              </button>
            )}
            
            <button 
              onClick={onManualGenerate}
              disabled={isBloggerActive}
              className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs border ${
                isBloggerActive 
                  ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed' 
                  : hasError 
                    ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30'
                    : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
              }`}
            >
              <i className={`fas ${hasError ? 'fa-redo' : 'fa-bolt text-yellow-500'}`}></i> 
              {hasError ? 'Retry Sync' : 'Manual Sync'}
            </button>
          </div>
        </div>
        
        <div className={`mt-6 p-4 rounded-2xl text-sm border-l-4 transition-colors duration-300 ${hasError ? 'bg-red-500/10 border-red-500' : 'bg-black/30 border-yellow-500'}`}>
          <div className="flex justify-between items-center mb-2">
            <p className="font-mono text-[10px] opacity-50 uppercase tracking-widest">SYSTEM_LOG:</p>
            {hasError && <span className="text-[10px] text-red-500 font-black animate-pulse">FAULT_DETECTED</span>}
          </div>
          <p className={`text-xs h-10 overflow-hidden line-clamp-2 leading-tight ${hasError ? 'text-red-400 font-medium' : 'opacity-90'}`}>{status}</p>
          <div className="w-full bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ease-out ${hasError ? 'bg-red-500' : 'bg-yellow-500'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 glass p-6 rounded-3xl">
        <h3 className="text-xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
          <i className="fas fa-chart-line"></i> Market Intelligence
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 custom-scrollbar overflow-y-auto max-h-[250px] pr-2">
          {trendingTopics.map((topic, idx) => (
            <div 
              key={idx} 
              className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 hover:border-yellow-500/50 transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold group-hover:text-yellow-500 transition-colors">{topic.title}</span>
                <span className={`text-[10px] px-2 py-1 rounded-md uppercase font-black ${
                  topic.volume === 'High' ? 'bg-red-500/20 text-red-500' : 
                  topic.volume === 'Medium' ? 'bg-yellow-500/20 text-yellow-500' : 
                  'bg-emerald-500/20 text-emerald-500'
                }`}>
                  {topic.volume}
                </span>
              </div>
              <p className="text-xs opacity-50 mt-1">{topic.category}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
