import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SIM_STORAGE_KEY } from '@/lib/env';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Test site simulator only: each simulated screen keeps its own sign-in.
    ...(SIM_STORAGE_KEY ? { storageKey: SIM_STORAGE_KEY } : {}),
  }
});
