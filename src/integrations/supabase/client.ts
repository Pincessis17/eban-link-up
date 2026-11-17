import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SIM_STORAGE_KEY } from '@/lib/env';

// A "reset your password" link can land on any page (Supabase falls back to the homepage if the
// address isn't on its allowed list). Remember it before the sign-in library reads the link,
// so the app can open the "choose a new password" page wherever the person arrives.
if (typeof window !== "undefined" && /type=recovery/.test(window.location.hash)) {
  try { sessionStorage.setItem("eban-recovery", "1"); } catch { /* private mode */ }
}

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
