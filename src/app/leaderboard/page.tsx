'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchGlobalStats } from '@/lib/api';
import { Trophy, Medal, Star, ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Skeleton, SkeletonRow } from '@/components/Skeleton';

// Render a stored ISO date, or a dash when it is missing or unparseable.
function fmtDate(s: string): string {
  const d = new Date(s);
  return s && !Number.isNaN(d.getTime()) ? d.toLocaleDateString() : '-';
}

interface TopScore {
  nickname: string;
  completed_at: string;
  score: number;
}

interface RecentPass {
  nickname: string;
  score: number;
}

interface GlobalStats {
  topScores: TopScore[];
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  averageTime: number;
  recentPasses: RecentPass[];
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'recent'>('score');

  useEffect(() => {
    async function load() {
      const data = await fetchGlobalStats();
      setStats(data as unknown as GlobalStats);
      setLoading(false);
    }
    load();
  }, []);

  // Client-side filter and sort over the already-loaded scores. This only
  // controls the rendered order; the rank chip and gold/silver/bronze styling
  // come from rankByEntry below, so they stay tied to true score standing.
  const visibleScores = useMemo(() => {
    const all = stats?.topScores ?? [];
    const ts = (s: string) => new Date(s).getTime() || 0; // missing/invalid dates sort last
    const sorted = [...all].sort((a, b) =>
      sortBy === 'recent' ? ts(b.completed_at) - ts(a.completed_at) : b.score - a.score
    );
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sorted.filter((entry) => (entry.nickname || 'Anonymous').toLowerCase().includes(q))
      : sorted;
    // The heading promises a top 10, so cap the rendered list even if the RPC returns more.
    return filtered.slice(0, 10);
  }, [stats, query, sortBy]);

  const hasAnyScores = (stats?.topScores?.length ?? 0) > 0;

  // True standing by score, so the rank chip and gold/silver/bronze styling
  // stay tied to a player's real rank even when the list is filtered or
  // re-sorted by recency. Keyed by the row's identity (nickname + timestamp).
  const rankByEntry = useMemo(() => {
    const map = new Map<string, number>();
    [...(stats?.topScores ?? [])]
      .sort((a, b) => b.score - a.score)
      .forEach((entry, i) => {
        map.set(`${entry.nickname}|${entry.completed_at}|${entry.score}`, i);
      });
    return map;
  }, [stats]);

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-12 flex flex-col gap-8">
      <button
        onClick={() => router.push('/')}
        className="flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="w-8 h-8 text-primary" />
          Global Leaderboard
        </h1>
        <p className="text-foreground/60 mt-1">See how you stack up against other candidates.</p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-12">
          {/* Top 10 High Scores placeholder */}
          <div className="flex flex-col gap-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="glass-panel rounded-2xl overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          </div>

          {/* Overview placeholder */}
          <div className="flex flex-col gap-4">
            <Skeleton className="h-7 w-32" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-panel p-6 rounded-xl flex flex-col gap-3">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-12">
          {/* Top 10 High Scores */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" /> Top 10 High Scores
            </h2>

            {hasAnyScores && (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-foreground/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by nickname..."
                    aria-label="Search scores by nickname"
                    className="surface-panel w-full rounded-xl pl-10 pr-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <label className="sr-only" htmlFor="leaderboard-sort">
                  Sort scores
                </label>
                <select
                  id="leaderboard-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'score' | 'recent')}
                  className="surface-panel rounded-xl px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="score">Top score</option>
                  <option value="recent">Most recent</option>
                </select>
              </div>
            )}

            <div className="glass-panel rounded-2xl overflow-hidden">
              {visibleScores.map((entry: TopScore, i: number) => {
                const rank =
                  rankByEntry.get(`${entry.nickname}|${entry.completed_at}|${entry.score}`) ?? i;
                return (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={`${entry.nickname}-${entry.completed_at}-${i}`}
                    className={`flex items-center justify-between p-4 border-b border-border last:border-0 ${
                      rank === 0
                        ? 'bg-primary/10'
                        : rank === 1
                          ? 'bg-[var(--overlay-subtle)]'
                          : rank === 2
                            ? 'bg-[var(--overlay-subtle)]'
                            : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div
                        className={`w-9 h-9 sm:w-8 sm:h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                          rank === 0
                            ? 'bg-primary text-primary-foreground'
                            : rank === 1
                              ? 'bg-gray-300 text-black'
                              : rank === 2
                                ? 'bg-[#cd7f32] text-black'
                                : 'glass-panel'
                        }`}
                      >
                        {rank + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{entry.nickname || 'Anonymous'}</div>
                        <div className="text-xs text-foreground/50">
                          {fmtDate(entry.completed_at)}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-lg">{entry.score}</div>
                  </motion.div>
                );
              })}
              {!hasAnyScores && (
                <div className="p-8 text-center text-foreground/50">
                  No scores recorded yet. Be the first!
                </div>
              )}
              {hasAnyScores && visibleScores.length === 0 && (
                <div className="p-8 text-center text-foreground/50">
                  No players match that name.
                </div>
              )}
            </div>
          </div>

          {/* General Stats */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Medal className="w-5 h-5 text-primary" /> Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel p-6 rounded-xl flex flex-col gap-2">
                <div className="text-4xl font-bold">{stats?.totalAttempts || 0}</div>
                <div className="text-sm text-foreground/60">Total Exams Taken</div>
              </div>
              <div className="glass-panel p-6 rounded-xl flex flex-col gap-2">
                <div className="text-4xl font-bold">{stats?.averageScore || 0}</div>
                <div className="text-sm text-foreground/60">Average Score</div>
              </div>
              <div className="glass-panel p-6 rounded-xl flex flex-col gap-2">
                <div className="text-4xl font-bold">{stats?.passRate || 0}%</div>
                <div className="text-sm text-foreground/60">Overall Pass Rate</div>
              </div>
              <div className="glass-panel p-6 rounded-xl flex flex-col gap-2">
                <div className="text-4xl font-bold">
                  {Math.floor((stats?.averageTime || 0) / 60)}m
                </div>
                <div className="text-sm text-foreground/60">Avg Time Taken</div>
              </div>
            </div>

            {stats?.recentPasses && stats.recentPasses.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/60 mb-3">
                  Recent Passes
                </h3>
                <div className="flex flex-col gap-2">
                  {stats.recentPasses.map((p: RecentPass, i: number) => (
                    <div
                      key={i}
                      className="glass-panel p-3 rounded-lg text-sm flex items-center justify-between"
                    >
                      <span className="font-medium">{p.nickname || 'Anonymous'}</span>
                      <span className="font-mono text-success">{p.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
