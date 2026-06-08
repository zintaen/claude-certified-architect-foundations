import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import BugReporter from '@/components/BugReporter';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Claude Certified Architect - Mock Exam',
  description:
    'Test your skills with a simulated environment for the Anthropic Claude Certified Architect exam.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <header className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 bg-background/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono">
              C
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight">Claude Certified Architect</h1>
              <p className="text-[10px] text-primary uppercase tracking-widest">Mock Exam</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-primary transition-colors">
              Practice
            </Link>
            <Link href="/leaderboard" className="hover:text-primary transition-colors">
              Leaderboard
            </Link>
            <Link href="/about" className="hover:text-primary transition-colors">
              About
            </Link>
          </nav>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>
        <BugReporter />
      </body>
    </html>
  );
}
