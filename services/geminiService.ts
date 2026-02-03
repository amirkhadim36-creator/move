
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AIPost, Movie } from "../types";

// Helper to encode Uint8Array to Base64
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to decode Base64 to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const geminiService = {
  /**
   * Generates a high-fidelity cinematic review using technical metadata.
   */
  generateMovieReview: async (movieTitle: string, tmdbId: number, tmdbRating: number, details: Partial<Movie> & { genre_names?: string[] }): Promise<Partial<AIPost>> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const targetSentiment = Math.round(tmdbRating * 10);
    const budgetStr = details.budget ? `$${(details.budget / 1000000).toFixed(1)}M` : 'Undisclosed';
    const genreStr = details.genre_names?.join(', ') || 'General Cinema';

    const prompt = `Perform a high-end cinematic analysis of the movie "${movieTitle}" (TMDB ID: ${tmdbId}). 
    Context: It has a rating of ${tmdbRating}/10, budget of ${budgetStr}, and genres: ${genreStr}.
    Output JSON with:
    1. "title": A dramatic headline.
    2. "preview": A 1-sentence captivating hook.
    3. "content": A detailed review in HTML format. Use <h2> for sections like "Narrative Architecture", "Visual Language", "Critical Verdict". Use <strong> for emphasis.
    4. "sentiment": A number (0-100) reflecting the critical reception.
    5. "category": The primary genre from the provided list.
    6. "keywords": 5 relevant technical or thematic tags.
    7. "tagline": A short catchy movie tagline.
    8. "runtime": The movie runtime in minutes.
    9. "budget": Total budget number.
    10. "revenue": Total revenue number.
    11. "status": Production status.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            preview: { type: Type.STRING },
            content: { type: Type.STRING },
            sentiment: { type: Type.NUMBER },
            category: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            tagline: { type: Type.STRING },
            runtime: { type: Type.NUMBER },
            budget: { type: Type.NUMBER },
            revenue: { type: Type.NUMBER },
            status: { type: Type.STRING }
          },
          required: ["title", "preview", "content", "sentiment", "category"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  },

  /**
   * Generates a high-quality audio narration of the review.
   * Returns a base64 string of the raw PCM audio data.
   */
  generateSpeech: async (text: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ 
          text: `Read this cinematic movie review with a professional, deep-toned narrator voice. Be dramatic and clear: ${text}` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed: No data returned.");
    
    return base64Audio;
  },

  /**
   * Decodes raw PCM base64 string into an AudioBuffer.
   */
  decodeAudio: async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
    const binary = decode(base64);
    const dataInt16 = new Int16Array(binary.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  }
};
