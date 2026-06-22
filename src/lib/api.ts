import { supabase } from './supabase';
import { PASS_SCORE } from '@/lib/domains';

// This module is the single adapter boundary between the Supabase RPCs and the V2 UI.
// The (un-versioned) database functions return snake_case JSON - get_global_stats returns
// { total_exams, avg_score, pass_rate, hardest_questions[], leaderboard[] } and get_user_history
// returns { success, results[] } with rows shaped { nickname, score, time_taken, taken_at }.
// The V2 pages consume camelCase, so the rewrite read fields that did not exist (topScores,
// totalAttempts, completed_at, ...) and rendered empty. Map the real shape here; do not let the
// pages read raw RPC JSON.

interface RawRow {
  nickname?: string | null;
  score?: number | null;
  time_taken?: number | null;
  taken_at?: string | null;
}

interface RawGlobalStats {
  total_exams?: number | null;
  avg_score?: number | null;
  pass_rate?: number | null;
  hardest_questions?: { index: number; misses: number }[] | null;
  leaderboard?: RawRow[] | null;
}

interface RawUserHistory {
  success?: boolean;
  results?: RawRow[] | null;
}

export interface TopScore {
  nickname: string;
  completed_at: string;
  score: number;
}

export interface RecentPass {
  nickname: string;
  score: number;
}

export interface GlobalStats {
  topScores: TopScore[];
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTime: number;
  recentPasses: RecentPass[];
}

export interface Attempt {
  score: number;
  completed_at: string;
  time_taken: number;
}

export interface UserHistory {
  attempts: Attempt[];
  totalAttempts: number;
  highestScore: number;
  passRate: number;
  averageTime: number;
}

const PASS_MARK = PASS_SCORE; // official CCA-F pass mark (720 / 1000)
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export async function fetchGlobalStats(): Promise<GlobalStats | null> {
  const { data, error } = await supabase.rpc('get_global_stats');
  if (error || !data) {
    console.error('Failed to fetch global stats:', error);
    return null;
  }

  const raw = data as unknown as RawGlobalStats;
  const rows = Array.isArray(raw.leaderboard) ? raw.leaderboard : [];

  const topScores: TopScore[] = rows.map((row) => ({
    nickname: row.nickname || 'Anonymous',
    completed_at: row.taken_at || '',
    score: num(row.score),
  }));

  // The RPC has no global average-time field, so derive it from the leaderboard rows that carry a
  // time. recentPasses likewise is not a distinct RPC field; surface the most recent passers.
  const timed = rows.filter((row) => num(row.time_taken) > 0);
  const averageTime = timed.length
    ? Math.round(timed.reduce((sum, row) => sum + num(row.time_taken), 0) / timed.length)
    : 0;

  const recentPasses: RecentPass[] = rows
    .filter((row) => num(row.score) >= PASS_MARK)
    .sort((a, b) => (b.taken_at || '').localeCompare(a.taken_at || ''))
    .slice(0, 5)
    .map((row) => ({ nickname: row.nickname || 'Anonymous', score: num(row.score) }));

  return {
    topScores,
    totalAttempts: num(raw.total_exams),
    averageScore: Math.round(num(raw.avg_score)),
    passRate: Math.round(num(raw.pass_rate)),
    averageTime,
    recentPasses,
  };
}

export async function fetchUserHistory(
  email: string,
  pinHash: string
): Promise<UserHistory | null> {
  const { data, error } = await supabase.rpc('get_user_history', {
    p_email: email,
    p_pin_hash: pinHash,
  });
  if (error || !data) {
    console.error('Failed to fetch user history:', error);
    return null;
  }

  const raw = data as unknown as RawUserHistory;
  // get_user_history reports auth/credential failure via success=false (matches V1 behaviour).
  if (!raw.success) return null;

  const rows = Array.isArray(raw.results) ? raw.results : [];
  const attempts: Attempt[] = rows.map((row) => ({
    score: num(row.score),
    completed_at: row.taken_at || '',
    time_taken: num(row.time_taken),
  }));

  const totalAttempts = attempts.length;
  const highestScore = attempts.reduce((max, a) => Math.max(max, a.score), 0);
  const passRate = totalAttempts
    ? Math.round((100 * attempts.filter((a) => a.score >= PASS_MARK).length) / totalAttempts)
    : 0;
  const averageTime = totalAttempts
    ? Math.round(attempts.reduce((sum, a) => sum + a.time_taken, 0) / totalAttempts)
    : 0;

  return { attempts, totalAttempts, highestScore, passRate, averageTime };
}
