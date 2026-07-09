'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/store/examStore';
import { PlayCircle, X, MonitorSmartphone } from 'lucide-react';
import {
  isIdentified,
  loadServerSession,
  restoreServerSession,
  clearServerSession,
  type SavedSession,
} from '@/lib/serverSession';

// Shows a resume prompt when a sitting was started but not submitted. Two cases:
//   1. Local: the session persists on this device, so it survives a refresh, a closed tab, or a
//      dropped connection. This is the primary path and works offline.
//   2. Remote (identified users only): if there is nothing local but a server checkpoint exists,
//      offer to resume on this device, so you can continue an exam started elsewhere.
// Renders nothing until zustand has rehydrated, so it never flashes on a cold load.
export default function ResumeBanner() {
  const store = useExamStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [remote, setRemote] = useState<SavedSession | null>(null);

  useEffect(() => {
    const unsub = useExamStore.persist.onFinishHydration(() => setHydrated(true));
    if (useExamStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  const localInProgress =
    hydrated && store.items.length > 0 && !store.finished && !store.isFlashcardMode;

  // Only look for a server checkpoint when there is nothing local to resume and the user is
  // identified - i.e. the "started on another device" case.
  useEffect(() => {
    if (!hydrated || localInProgress || !isIdentified()) return;
    let cancelled = false;
    loadServerSession().then((s) => {
      if (!cancelled) setRemote(s);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, localInProgress]);

  if (!hydrated) return null;

  if (localInProgress) {
    const total = store.items.length;
    const answered = store.items.filter((i) => i.chosenLetter).length;
    const mode = store.untimed ? 'practice' : 'timed';
    return (
      <div className="w-full max-w-6xl mx-auto px-6 pt-6">
        <div className="surface-raised border border-primary/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">You have a {mode} exam in progress</div>
              <div className="text-sm text-muted">
                {answered} of {total} answered. Your progress is saved on this device.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/exam"
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
            >
              Resume exam
            </Link>
            <button
              type="button"
              onClick={() => {
                store.discardSession();
                void clearServerSession();
              }}
              className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" /> Discard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (remote) {
    const total = remote.ids.length;
    const answered = Object.keys(remote.answers).length;
    const mode = remote.untimed ? 'practice' : 'timed';
    const restore = () => {
      if (restoreServerSession(remote)) router.push('/exam');
    };
    const dismiss = () => {
      setRemote(null);
      void clearServerSession();
    };
    return (
      <div className="w-full max-w-6xl mx-auto px-6 pt-6">
        <div className="surface-raised border border-primary/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MonitorSmartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold">Resume your {mode} exam from another device</div>
              <div className="text-sm text-muted">
                {answered} of {total} answered. Pick up where you left off.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={restore}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold inline-flex items-center gap-2 hover:brightness-110 transition-all"
            >
              Restore exam
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" /> Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
