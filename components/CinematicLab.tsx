import React, { useState, useEffect } from 'react';
import { veoService } from '../services/veoService';

interface CinematicLabProps {
  onClose?: () => void;
}

export const CinematicLab: React.FC<CinematicLabProps> = ({ onClose }) => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("System Ready");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    // Assuming window.aistudio is available in the environment
    const keySelected = await (window as any).aistudio.hasSelectedApiKey();
    setHasKey(keySelected);
  };

  const handleOpenSelectKey = async () => {
    await (window as any).aistudio.openSelectKey();
    // Proceed assuming success as per guidelines
    setHasKey(true);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setVideoUrl(null);
    try {
      const url = await veoService.generateMovieClip(prompt, { resolution, aspectRatio }, setStatus);
      setVideoUrl(url);
      setStatus("Generation Successful");
    } catch (err: any) {
      setStatus(`Error: ${err.message || "Failed to generate video"}`);
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (hasKey === false) {
    return (
      <div className="glass p-8 rounded-[2.5rem] border-yellow-500/20 text-center flex flex-col items-center gap-6">
        <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20 shadow-2xl">
          <i className="fas fa-lock text-yellow-500 text-3xl"></i>
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Unlock Cinematic Vision</h3>
          <p className="text-sm text-white/50 max-w-sm mx-auto mb-6">
            Veo video generation requires a paid API key from a billing-enabled Google Cloud project.
          </p>
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            className="text-yellow-500 text-[10px] font-black uppercase tracking-widest hover:underline mb-4 block"
          >
            Review Billing Documentation
          </a>
          <button 
            onClick={handleOpenSelectKey}
            className="btn-gradient px-10 py-4 rounded-2xl text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform"
          >
            Select Paid API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-8 rounded-[2.5rem] border-yellow-500/20 relative overflow-hidden">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-black text-yellow-500 flex items-center gap-3">
          <i className="fas fa-video animate-pulse"></i> CINEMATIC LAB
        </h3>
        {isGenerating && (
           <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-yellow-500/20">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-ping"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{status}</span>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Visual Prompt</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your movie scene (e.g., 'A cyberpunk detective walking through neon rain in Neo-Tokyo...')"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-[1.5rem] p-6 text-sm focus:outline-none focus:border-yellow-500 transition-all h-32 resize-none custom-scrollbar"
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Format</label>
              <select 
                value={aspectRatio}
                onChange={(e: any) => setAspectRatio(e.target.value)}
                className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-xs font-black uppercase tracking-widest outline-none focus:border-yellow-500"
                disabled={isGenerating}
              >
                <option value="16:9">Widescreen (16:9)</option>
                <option value="9:16">Vertical (9:16)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-2">Resolution</label>
              <select 
                value={resolution}
                onChange={(e: any) => setResolution(e.target.value)}
                className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-xs font-black uppercase tracking-widest outline-none focus:border-yellow-500"
                disabled={isGenerating}
              >
                <option value="720p">HD (720p)</option>
                <option value="1080p">Full HD (1080p)</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-3 ${
              isGenerating || !prompt.trim() 
                ? 'bg-slate-800 text-white/20 cursor-not-allowed' 
                : 'btn-gradient text-black hover:scale-[1.02] shadow-[0_0_30px_rgba(245,158,11,0.2)]'
            }`}
          >
            {isGenerating ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Synthesizing...
              </>
            ) : (
              <>
                <i className="fas fa-wand-magic-sparkles"></i> Render Vision
              </>
            )}
          </button>
        </div>

        <div className="relative aspect-[16/9] bg-slate-900 rounded-[1.5rem] border border-slate-800 flex items-center justify-center overflow-hidden group shadow-2xl">
          {isGenerating && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-pulse">
               <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500">{status}</p>
            </div>
          )}

          {videoUrl ? (
            <div className="w-full h-full relative">
              <video 
                src={videoUrl} 
                className="w-full h-full object-contain" 
                controls 
                autoPlay 
                loop
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                <a 
                  href={videoUrl} 
                  download="cinematic_vision.mp4"
                  className="w-10 h-10 glass rounded-full flex items-center justify-center text-white hover:text-yellow-500 transition-all border border-white/10"
                >
                  <i className="fas fa-download"></i>
                </a>
              </div>
            </div>
          ) : !isGenerating && (
            <div className="text-center opacity-20 group-hover:opacity-40 transition-opacity">
              <i className="fas fa-clapperboard text-6xl mb-4"></i>
              <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Neural Projection</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
