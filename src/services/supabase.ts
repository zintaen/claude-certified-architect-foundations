import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export let sbClient: any = null;

if (supabaseUrl && supabaseKey) {
  sbClient = createClient(supabaseUrl, supabaseKey);
  // Optional: keep it on window for legacy interop if needed, but prefer imports
  (window as any).sbClient = sbClient;
}
