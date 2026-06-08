"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlayCircle, ShieldCheck, Zap, BarChart, X } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [showSetup, setShowSetup] = useState(false);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");

  useEffect(() => {
     
    setEmail(localStorage.getItem('ccaf-email') || "");
    setNickname(localStorage.getItem('ccaf-nickname') || "");
  }, []);

  const handleStart = () => {
    if (email) localStorage.setItem('ccaf-email', email);
    if (nickname) localStorage.setItem('ccaf-nickname', nickname);
    if (pin) localStorage.setItem('ccaf-pinHash', pin); // Note: Should ideally be hashed
    router.push('/exam');
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-12 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Hero Copy */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-start gap-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel border-primary/30 text-xs font-mono text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            V2.0: Next.js Rewrite Live
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Master the <br />
            <span className="text-gradient">Claude Architect</span> <br />
            Certification.
          </h1>
          
          <p className="text-lg text-foreground/70 max-w-md">
            Simulate the exact conditions of the official Anthropic exam. Test your knowledge in prompt engineering, security, model orchestration, and system design.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowSetup(true)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] transition-all"
            >
              <PlayCircle className="w-5 h-5" />
              Start Mock Exam
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/leaderboard')}
              className="glass-panel px-6 py-3 rounded-md font-medium hover:bg-white/5 transition-colors"
            >
              View Leaderboard
            </motion.button>
          </div>
        </motion.div>

        {/* Right Side: Feature Cards */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative"
        >
          {/* Connecting Lines */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-primary/10 rounded-full blur-[2px] -z-10" />

          <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 glass-panel-hover transition-all">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">Timed Simulation</h3>
            <p className="text-sm text-foreground/60">Practice under the real 120-minute time constraint to build your pacing strategy.</p>
          </div>

          <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 glass-panel-hover transition-all translate-y-0 sm:translate-y-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">Anti-Cheat Mode</h3>
            <p className="text-sm text-foreground/60">Experience strict focus-tracking and fullscreen enforcement just like the real proctoring system.</p>
          </div>

          <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 glass-panel-hover transition-all">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BarChart className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">Domain Breakdown</h3>
            <p className="text-sm text-foreground/60">Identify your weak points with a comprehensive radar chart analysis post-exam.</p>
          </div>
          
          <div className="glass-panel p-6 rounded-xl flex flex-col gap-3 glass-panel-hover transition-all translate-y-0 sm:translate-y-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <div className="font-bold">60</div>
            </div>
            <h3 className="font-semibold">Curated Scenarios</h3>
            <p className="text-sm text-foreground/60">Tackle complex, multi-part scenario questions matching the official blueprint.</p>
          </div>

        </motion.div>
      </main>

      {/* Setup Modal */}
      <AnimatePresence>
        {showSetup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-md p-6 flex flex-col gap-6 rounded-2xl relative"
            >
              <button 
                onClick={() => setShowSetup(false)}
                className="absolute top-4 right-4 p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 opacity-60" />
              </button>
              
              <div>
                <h2 className="text-xl font-bold mb-1">Exam Setup</h2>
                <p className="text-sm text-foreground/60">Enter your details to save your score and receive a copy via email.</p>
              </div>

              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium opacity-80">Email (Optional, to get results)</span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-input border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium opacity-80">Nickname (For leaderboard)</span>
                  <input 
                    type="text" 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="bg-input border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="CyberNinja99"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium opacity-80">Secret PIN (To protect your history)</span>
                  <input 
                    type="password" 
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="bg-input border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                    placeholder="••••"
                  />
                </label>
              </div>

              <button
                onClick={handleStart}
                className="bg-primary text-primary-foreground w-full py-3 rounded-md font-bold mt-2 shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:bg-primary/90 transition-colors"
              >
                Begin Exam
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
