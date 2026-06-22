'use client';

import { useEffect, useState } from 'react';
import { fetchUserHistory } from '@/lib/api';
import { ArrowLeft, User, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Skeleton, SkeletonRow } from '@/components/Skeleton';

interface Attempt {
  score: number;
  time_taken: number;
  completed_at: string;
}

interface UserHistory {
  totalAttempts: number;
  highestScore: number;
  passRate: number;
  averageTime: number;
  attempts: Attempt[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [history, setHistory] = useState<UserHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    async function load() {
      const email = localStorage.getItem('ccaf-email');
      const pinHash = localStorage.getItem('ccaf-pinHash');

      // No saved identity: a neutral empty state, not an error.
      if (!email || !pinHash) {
        setSignedOut(true);
        setLoading(false);
        return;
      }

      const data = await fetchUserHistory(email, pinHash);
      if (!data) {
        // A valid account with no attempts returns an empty history object, so a null here
        // means a wrong PIN for this email or a network problem - not just "no history".
        setError(
          'We could not load your history. If you save progress with a PIN, double-check the PIN for this email and try again.'
        );
      } else {
        setHistory(data as unknown as UserHistory);
      }
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
          <User className="w-8 h-8 text-primary" />
          Your Dashboard
        </h1>
        <p className="text-foreground/60 mt-1">
          Review your past performance and track your growth.
        </p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-12">
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

          {/* History placeholder */}
          <div className="flex flex-col gap-4">
            <Skeleton className="h-7 w-28" />
            <div className="glass-panel rounded-2xl overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          </div>
        </div>
      ) : signedOut ? (
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center text-center gap-4">
          <p className="text-foreground/70 max-w-md">
            No saved history yet. Take a timed mock and add your email and PIN on the start screen,
            and your past attempts will appear here.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:brightness-110 transition-all"
          >
            Start a mock
          </button>
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center text-foreground/70 rounded-2xl">{error}</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-12">
          {/* General Stats */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel p-6 rounded-xl flex flex-col gap-2">
                <div className="text-4xl font-bold">{history?.totalAttempts || 0}</div>
                <div className="text-sm text-foreground/60">Total Exams Taken</div>
              </div>
              <div className="glass-panel p-6 rounded-xl flex flex-col gap-2">
                <div className="text-4xl font-bold">{history?.highestScore || 0}</div>
                <div className="text-sm text-foreground/60">Highest Score</div>
              </div>
              <div className="glass-panel p-6 rounded-xl flex flex-col gap-2">
                <div className="text-4xl font-bold">{history?.passRate || 0}%</div>
                <div className="text-sm text-foreground/60">Pass Rate</div>
              </div>
              <div className="glass-panel p-6 rounded-xl flex flex-col gap-2">
                <div className="text-4xl font-bold">
                  {Math.floor((history?.averageTime || 0) / 60)}m
                </div>
                <div className="text-sm text-foreground/60">Avg Time Taken</div>
              </div>
            </div>
          </div>

          {/* Past Attempts */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">History</h2>
            <div className="glass-panel rounded-2xl overflow-hidden">
              {}
              {(history?.attempts || []).map((entry: Attempt, i: number) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i}
                  className={`flex items-center justify-between p-4 border-b border-border last:border-0 ${
                    entry.score >= 700
                      ? 'border-l-4 border-l-success'
                      : 'border-l-4 border-l-destructive'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="font-bold">Score: {entry.score}</div>
                    <div className="text-xs text-foreground/50">
                      {new Date(entry.completed_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="font-mono text-sm">
                    {Math.floor(entry.time_taken / 60)}m {entry.time_taken % 60}s
                  </div>
                </motion.div>
              ))}
              {(!history?.attempts || history.attempts.length === 0) && (
                <div className="p-8 text-center text-foreground/50">No exam history found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
