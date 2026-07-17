'use client';

import { useState } from 'react';
import { Bug, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

export default function BugReporter() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pathname = usePathname();

  // Keep the feedback affordance off marketing pages and immersive exam sittings
  // (fixed FAB would cover mobile prev/next controls).
  if (
    pathname === '/' ||
    pathname === '/about' ||
    pathname === '/exam' ||
    pathname === '/flashcards'
  ) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const email = typeof window !== 'undefined' ? localStorage.getItem('ccaf-email') : undefined;
    const nickname =
      typeof window !== 'undefined' ? localStorage.getItem('ccaf-nickname') : undefined;
    const browserInfo = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;

    try {
      const { error: dbError } = await supabase.from('bug_reports').insert({
        user_email: email || undefined,
        nickname: nickname || undefined,
        route: pathname,
        message: message.trim(),
        browser_info: browserInfo,
      });

      if (dbError) {
        console.error('Bug report error:', dbError);
        throw new Error(
          dbError.message || 'Failed to submit bug report. Make sure the database table is set up.'
        );
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setMessage('');
      }, 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="surface-panel fixed bottom-6 right-6 z-50 min-h-11 min-w-11 p-2.5 rounded-full text-muted shadow-sm backdrop-blur-sm transition-all hover:border-ring hover:text-primary hover:scale-105 active:scale-95 inline-flex items-center justify-center"
        title="Report a bug"
        aria-label="Report a bug"
      >
        <Bug className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-[var(--scrim)] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="bg-panel border border-border p-6 rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-foreground/50 hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="bg-destructive/20 p-2 rounded-lg text-destructive">
                  <Bug className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Report a Bug</h2>
                  <p className="text-sm text-foreground/60">Help us improve the experience.</p>
                </div>
              </div>

              {success ? (
                <div className="py-8 flex flex-col items-center gap-3 text-success text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-success/30 flex items-center justify-center bg-success/10">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="font-bold">Report Submitted!</div>
                  <p className="text-sm text-foreground/70">Thank you for your feedback.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground/80 mb-1.5 block">
                      What went wrong?
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe the issue you encountered..."
                      className="w-full h-32 bg-input border border-border rounded-xl p-3 text-sm focus:outline-none focus:border-ring transition-colors resize-none"
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Submit Report
                      </>
                    )}
                  </button>
                  <p className="text-xs text-center text-foreground/40">
                    Your current route and device info will be included automatically.
                  </p>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
