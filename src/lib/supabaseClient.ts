import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Fallback values for GitHub Pages deployment (anon key is public/publishable)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://sywgjwxtuijrdmekxquj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2dqd3h0dWlqcmRtZWt4cXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDk5OTcsImV4cCI6MjA3OTk4NTk5N30.L_Yoy10z0WWXZlG3czTvspBw8Z6vjxQfcU30ibvpGrY';

export const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
