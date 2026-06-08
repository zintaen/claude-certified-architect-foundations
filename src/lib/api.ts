import { supabase } from './supabase';



export async function fetchGlobalStats() {
  const { data, error } = await supabase.rpc('get_global_stats');
  if (error) {
    console.error('Failed to fetch global stats:', error);
    return null;
  }
  return data;
}

export async function fetchUserHistory(email: string, pinHash: string) {
  const { data, error } = await supabase.rpc('get_user_history', {
    p_email: email,
    p_pin_hash: pinHash,
  });
  if (error) {
    console.error('Failed to fetch user history:', error);
    return null;
  }
  return data;
}
