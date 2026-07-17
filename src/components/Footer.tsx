import Link from 'next/link';
import Image from 'next/image';
import { Mail, ExternalLink, Globe } from 'lucide-react';
import DonateButton from './DonateButton';

const YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-panel/60">
      <div className="max-w-6xl mx-auto px-6 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/cyberskill-logo.svg"
              alt="CyberSkill"
              width={36}
              height={36}
              className="rounded-md"
            />
            <div>
              <div className="font-bold tracking-tight">CyberSkill</div>
              <div className="text-xs text-primary font-medium">Turn Your Will Into Real</div>
            </div>
          </div>
          <p className="text-sm text-muted leading-relaxed max-w-xs">
            A software solutions consultancy building products and developer tools. This mock exam
            is one of our free resources for the Claude practitioner community.
          </p>
          <DonateButton variant="soft" label="Support this project" className="self-start mt-1" />
        </div>

        {/* Mock exam links */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Mock exam</h3>
          <Link
            href="/"
            className="text-sm text-foreground/80 hover:text-primary transition-colors py-2 min-h-11 inline-flex items-center"
          >
            Practice
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm text-foreground/80 hover:text-primary transition-colors py-2 min-h-11 inline-flex items-center"
          >
            Leaderboard
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-foreground/80 hover:text-primary transition-colors py-2 min-h-11 inline-flex items-center"
          >
            Your dashboard
          </Link>
          <Link
            href="/changelog"
            className="text-sm text-foreground/80 hover:text-primary transition-colors py-2 min-h-11 inline-flex items-center"
          >
            Changelog
          </Link>
          <Link
            href="/about"
            className="text-sm text-foreground/80 hover:text-primary transition-colors py-2 min-h-11 inline-flex items-center"
          >
            About
          </Link>
        </div>

        {/* Learn links */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Learn</h3>
          <Link
            href="/guide"
            className="text-sm text-foreground/80 hover:text-primary transition-colors py-2 min-h-11 inline-flex items-center"
          >
            Study guide
          </Link>
          <Link
            href="/sample-questions"
            className="text-sm text-foreground/80 hover:text-primary transition-colors py-2 min-h-11 inline-flex items-center"
          >
            Sample questions
          </Link>
          <Link
            href="/faq"
            className="text-sm text-foreground/80 hover:text-primary transition-colors py-2 min-h-11 inline-flex items-center"
          >
            FAQ
          </Link>
          <Link
            href="/domains"
            className="text-sm text-foreground/80 hover:text-primary transition-colors py-2 min-h-11 inline-flex items-center"
          >
            Domains
          </Link>
        </div>

        {/* Company links */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted">CyberSkill</h3>
          <a
            href="https://cyberskill.world"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <Globe className="w-4 h-4" /> cyberskill.world
          </a>
          <a
            href="mailto:info@cyberskill.world"
            className="text-sm text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <Mail className="w-4 h-4" /> info@cyberskill.world
          </a>
          <a
            href="https://buymeacoffee.com/zintaen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground/80 hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Buy me a coffee
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-muted">
          <p>
            &copy; {YEAR} CyberSkill Software Solutions Consultancy and Development JSC. Ho Chi Minh
            City, Vietnam.
          </p>
          <p className="text-center sm:text-right">
            Unofficial study aid - not affiliated with or endorsed by Anthropic.
          </p>
        </div>
      </div>
    </footer>
  );
}
