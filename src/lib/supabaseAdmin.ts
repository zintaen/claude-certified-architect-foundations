import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../core/database.types';

// Server-only Supabase client that authenticates with the service-role key.
//
// NEVER import this from a client component. The service-role key bypasses Row Level
// Security and must never reach the browser, so it has no NEXT_PUBLIC_ fallback and is
// read only from a server environment variable.
//
// This exists so the leaderboard write keeps working after EXECUTE on submit_exam_result
// is revoked from the anon role (see supabase/migrations). The grade route computes the
// score on the server and writes it through this client.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://idtmcfqcgvecrivvtsxv.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Null when the key is not configured, so callers can fall back and degrade gracefully
// rather than crash.
export const supabaseAdmin: SupabaseClient<Database> | null = SERVICE_ROLE_KEY
  ? createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
