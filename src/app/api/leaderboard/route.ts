import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { leaderboardFromDb } from '@/lib/cutoverFlags';
import { PASS_SCORE } from '@/lib/domains';

/**
 * DATA-002: LEADERBOARD_FROM_DB=on reads top timed sittings; flag off restores
 * get_global_stats RPC over exam_results (no data operation to revert).
 */
export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ stats: null, path: 'unavailable' });
  }
  const db = supabaseAdmin as unknown as SupabaseClient;
  const fromDb = leaderboardFromDb();

  if (fromDb) {
    const { data, error } = await db
      .from('sittings')
      .select('score_pct, submitted_at, breakdown, mode')
      .eq('mode', 'exam')
      .not('submitted_at', 'is', null)
      .order('score_pct', { ascending: false })
      .limit(50);
    if (error || !data) {
      return NextResponse.json({ stats: null, path: 'db', error: error?.message });
    }
    const rows = data.map((r) => {
      const breakdown = (r.breakdown ?? {}) as Record<string, unknown>;
      const score =
        typeof breakdown.score === 'number'
          ? breakdown.score
          : Math.round(Number(r.score_pct ?? 0) * 10);
      return {
        nickname:
          typeof breakdown.nickname === 'string' && breakdown.nickname.trim()
            ? breakdown.nickname.trim()
            : 'Anonymous',
        score,
        completed_at: (r.submitted_at as string) || '',
        time_taken: typeof breakdown.timeSec === 'number' ? breakdown.timeSec : 0,
      };
    });
    const timed = rows.filter((r) => r.time_taken > 0);
    const averageTime = timed.length
      ? Math.round(timed.reduce((s, r) => s + r.time_taken, 0) / timed.length)
      : 0;
    const avg =
      rows.length === 0 ? 0 : Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length);
    const passRate =
      rows.length === 0
        ? 0
        : Math.round((rows.filter((r) => r.score >= PASS_SCORE).length / rows.length) * 100);
    return NextResponse.json({
      path: 'db',
      stats: {
        topScores: rows.slice(0, 10).map(({ nickname, score, completed_at }) => ({
          nickname,
          score,
          completed_at,
        })),
        totalAttempts: rows.length,
        averageScore: avg,
        passRate,
        averageTime,
        recentPasses: [...rows]
          .filter((r) => r.score >= PASS_SCORE)
          .sort((a, b) => b.completed_at.localeCompare(a.completed_at))
          .slice(0, 5)
          .map(({ nickname, score }) => ({ nickname, score })),
      },
    });
  }

  const { data, error } = await db.rpc('get_global_stats');
  if (error || !data) {
    return NextResponse.json({ stats: null, path: 'legacy', error: error?.message });
  }
  const raw = data as {
    total_exams?: number;
    avg_score?: number;
    pass_rate?: number;
    leaderboard?: {
      nickname?: string;
      score?: number;
      taken_at?: string;
      time_taken?: number;
    }[];
  };
  const lb = Array.isArray(raw.leaderboard) ? raw.leaderboard : [];
  const topScores = lb.map((row) => ({
    nickname: row.nickname || 'Anonymous',
    completed_at: row.taken_at || '',
    score: typeof row.score === 'number' ? row.score : 0,
  }));
  const timed = lb.filter((r) => typeof r.time_taken === 'number' && r.time_taken > 0);
  const averageTime = timed.length
    ? Math.round(
        timed.reduce((s, r) => s + (typeof r.time_taken === 'number' ? r.time_taken : 0), 0) /
          timed.length
      )
    : 0;
  return NextResponse.json({
    path: 'legacy',
    stats: {
      topScores,
      totalAttempts: raw.total_exams ?? 0,
      averageScore: Math.round(raw.avg_score ?? 0),
      passRate: Math.round(raw.pass_rate ?? 0),
      averageTime,
      recentPasses: lb
        .filter((r) => (r.score ?? 0) >= PASS_SCORE)
        .sort((a, b) => (b.taken_at || '').localeCompare(a.taken_at || ''))
        .slice(0, 5)
        .map((r) => ({ nickname: r.nickname || 'Anonymous', score: r.score ?? 0 })),
    },
  });
}
