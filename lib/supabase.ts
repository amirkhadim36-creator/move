
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ddjeuabtitmtqzwtoxsk.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkamV1YWJ0aXRtdHF6d3RveHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MjYxMDksImV4cCI6MjA4NTEwMjEwOX0.oflGeWchS7TIKAWuQkhy2fdaYHeyFfonj91yyXW7X5M';

/**
 * Custom no-op storage implementation for the Supabase Auth client.
 */
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * Supabase client configuration hardened for restricted/sandboxed environments.
 * We disable all persistence and tab-sync features to avoid navigator.locks calls.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: noopStorage,
    storageKey: 'movieultra-noauth-lock',
    // Disable BroadcastChannel usage if possible
    flowType: 'implicit'
  }
});
