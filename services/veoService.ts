import { GoogleGenAI } from "@google/genai";

export const veoService = {
  generateMovieClip: async (prompt: string, config: { resolution: '720p' | '1080p', aspectRatio: '16:9' | '9:16' }, onStatusUpdate: (status: string) => void) => {
    // Re-initialize to ensure we use the latest user-selected API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    onStatusUpdate("Initializing Cinematic Core...");
    
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic high-quality movie scene: ${prompt}, 8k, photorealistic, highly detailed, dramatic lighting, professional cinematography`,
        config: {
          numberOfVideos: 1,
          resolution: config.resolution,
          aspectRatio: config.aspectRatio
        }
      });

      const waitingMessages = [
        "Calibrating Neural Frames...",
        "Rendering Cinematic Textures...",
        "Polishing Visual Fidelity...",
        "Synthesizing Audio Harmonics...",
        "Finalizing Frame Sequence...",
        "Applying Color Grading..."
      ];
      
      let messageIndex = 0;
      while (!operation.done) {
        onStatusUpdate(waitingMessages[messageIndex % waitingMessages.length]);
        messageIndex++;
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      if (operation.error) {
        throw new Error(operation.error.message || "Video generation failed");
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("No video URI returned");

      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error("Requested entity was not found.");
        throw new Error("Failed to fetch generated video content.");
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      console.error('Veo Generation Error:', error);
      throw error;
    }
  }
};
