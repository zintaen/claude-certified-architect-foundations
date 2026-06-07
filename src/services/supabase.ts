import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://idtmcfqcgvecrivvtsxv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdG1jZnFjZ3ZlY3JpdnZ0c3h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjYwNjAsImV4cCI6MjA5NTM0MjA2MH0.SBB3j0xIjJt4hp9PzD0tX4VOd2vY5gIu6BddspVVFn4';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export let sbClient: any = null;

if (supabaseUrl && supabaseKey) {
  sbClient = createClient(supabaseUrl, supabaseKey);
  (window as any).sbClient = sbClient;
}
