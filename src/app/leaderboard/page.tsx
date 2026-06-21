'use client';

import { useEffect, useState } from 'react';
import { fetchGlobalStats } from '@/lib/api';
import { Trophy, Medal, Star, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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

  useEffect(() => {
    async function load() {
      const data = await fetchGlobalStats();
      setStats(data as unknown as GlobalStats);
      setLoading(false);
    }
    load();
  }, []);

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
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-12">
          {/* Top 10 High Scores */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" /> Top 10 High Scores
            </h2>
            <div className="glass-panel rounded-2xl overflow-hidden">
              {stats?.topScores?.map((entry: TopScore, i: number) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i}
                  className={`flex items-center justify-between p-4 border-b border-border last:border-0 ${
                    i === 0 ? 'bg-primary/10' : i === 1 ? 'bg-[var(--overlay-subtle)]' : i === 2 ? 'bg-[var(--overlay-subtle)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0
                          ? 'bg-primary text-primary-foreground'
                          : i === 1
                            ? 'bg-gray-300 text-black'
                            : i === 2
                              ? 'bg-[#cd7f32] text-black'
                              : 'glass-panel'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-bold">{entry.nickname || 'Anonymous'}</div>
                      <div className="text-xs text-foreground/50">
                        {new Date(entry.completed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-lg">{entry.score}</div>
                </motion.div>
              ))}
              {(!stats?.topScores || stats.topScores.length === 0) && (
                <div className="p-8 text-center text-foreground/50">
                  No scores recorded yet. Be the first!
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
