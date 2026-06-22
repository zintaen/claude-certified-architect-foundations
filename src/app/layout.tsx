import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import './globals.css';
import BugReporter from '@/components/BugReporter';
import Footer from '@/components/Footer';
import ThemeToggle from '@/components/ThemeToggle';
import DonateButton from '@/components/DonateButton';
import MobileNav from '@/components/MobileNav';
import MotionProvider from '@/components/MotionProvider';
import Analytics from '@/components/Analytics';
import { SpeedInsights } from '@vercel/speed-insights/next';

const SITE_URL = 'https://ccaf.cyberskill.world';

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam-pro',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

const SITE_TITLE = 'Claude Certified Architect - Mock Exam | CyberSkill';
const SITE_DESCRIPTION =
  'A free, unofficial practice exam for the Anthropic Claude Certified Architect certification. Timed simulation, scored feedback, and answer review - built by CyberSkill.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/cyberskill-logo.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    siteName: 'CyberSkill CCA-F Mock',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: 'sJ1sSGCn7S1YC4ePZo0knsWwD6fIw3FCmCXRE0E9yfE',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFDF8' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1108' },
  ],
};

// Set the theme before first paint to avoid a flash. Default is light;
// a stored preference (ccaf-theme) wins.
const themeInit = `(function(){try{var t=localStorage.getItem('ccaf-theme');if(t!=='dark'&&t!=='light'){t='light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body
        className={`${beVietnamPro.variable} ${jetbrainsMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/cyberskill-logo.svg"
                alt="CyberSkill"
                width={36}
                height={36}
                className="rounded-md"
              />
              <div className="leading-none">
                <h1 className="font-bold text-sm tracking-tight">Claude Certified Architect</h1>
                <p className="text-[10px] text-primary uppercase tracking-widest mt-1">
                  Mock Exam - by CyberSkill
                </p>
              </div>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-3 text-sm font-medium">
              <Link
                href="/"
                className="hidden sm:inline hover:text-primary transition-colors px-2 py-1"
              >
                Practice
              </Link>
              <Link
                href="/leaderboard"
                className="hidden sm:inline hover:text-primary transition-colors px-2 py-1"
              >
                Leaderboard
              </Link>
              <Link
                href="/guide"
                className="hidden sm:inline hover:text-primary transition-colors px-2 py-1"
              >
                Guide
              </Link>
              <Link
                href="/about"
                className="hidden sm:inline hover:text-primary transition-colors px-2 py-1"
              >
                About
              </Link>
              <DonateButton variant="ghost" label="Support" className="hidden sm:inline-flex" />
              <span className="hidden sm:inline-flex">
                <ThemeToggle />
              </span>
              <MobileNav />
            </nav>
          </div>
        </header>

        <MotionProvider>
          <main className="flex-1 flex flex-col">{children}</main>
        </MotionProvider>
        <Footer />
        <BugReporter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
