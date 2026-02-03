
export interface Movie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path?: string;
  overview: string;
  vote_average: number;
  release_date: string;
  genre_ids?: number[];
  // Detail-specific fields
  budget?: number;
  revenue?: number;
  status?: string;
  runtime?: number;
  tagline?: string;
}

export interface AIPost {
  id: string;
  tmdb_id: number;
  title: string;
  content: string;
  preview: string;
  image: string;
  timestamp: number;
  sentiment: number;
  keywords?: string[];
  category?: string;
  audio_base64?: string; // New field for persisting TTS
  // Technical specs
  budget?: number;
  revenue?: number;
  status?: string;
  runtime?: number;
  tagline?: string;
  // Local UI flags
  is_ai?: boolean;
}

export type ContentFilter = 'all' | 'ai' | 'trending';

export interface TrendingTopic {
  id: number;
  title: string;
  category: string;
  volume: 'High' | 'Medium' | 'Low';
  rating?: number;
  backdrop_path?: string;
  poster_path?: string;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  timestamp: number;
  status: 'processing' | 'completed' | 'failed';
}
