import { Coffee } from 'lucide-react';

const DONATE_URL = 'https://buymeacoffee.com/zintaen';

type Variant = 'ghost' | 'solid' | 'soft';

const STYLES: Record<Variant, string> = {
  // Quiet header link
  ghost:
    'text-foreground/70 hover:text-primary text-sm font-medium px-2 py-1 inline-flex items-center gap-1.5 transition-colors',
  // Filled call to action (gold in both themes for warmth)
  solid:
    'bg-gold text-[#1a1108] font-semibold px-5 py-2.5 rounded-md inline-flex items-center gap-2 shadow-[0_0_18px_var(--glow)] hover:brightness-105 active:scale-[0.98] transition-all',
  // Tinted, lower-emphasis button
  soft: 'surface-raised border border-border text-foreground hover:border-ring font-medium px-4 py-2 rounded-md inline-flex items-center gap-2 transition-colors',
};

export default function DonateButton({
  variant = 'solid',
  label = 'Buy me a coffee',
  className = '',
}: {
  variant?: Variant;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`${STYLES[variant]} ${className}`}
    >
      <Coffee className="w-4 h-4" />
      {label}
    </a>
  );
}
