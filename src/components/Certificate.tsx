'use client';

import { Download, Share2 } from 'lucide-react';

const SITE_URL = 'https://claude-certified-architect-mock-exam-cyberskill.vercel.app';

// Brand colors are literals here on purpose: a <canvas> 2D context cannot read CSS
// custom properties, and the PNG must render the same regardless of the page theme.
const CREAM = '#FFFDF8';
const UMBER = '#45210E';
const OCHRE = '#F4BA17';

function formatDate(dateISO: string): string {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Certificate({
  nickname,
  score,
  passed,
  dateISO,
}: {
  nickname?: string;
  score: number;
  passed: boolean;
  dateISO: string;
}) {
  const name = nickname && nickname.trim() ? nickname.trim() : 'Guest';

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, 1200, 800);

    // Outer border
    ctx.strokeStyle = UMBER;
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 1120, 720);

    // Inner accent rule
    ctx.strokeStyle = OCHRE;
    ctx.lineWidth = 2;
    ctx.strokeRect(56, 56, 1088, 688);

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = UMBER;
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('Claude Certified Architect - Foundations', 600, 180);

    // Subtitle
    ctx.font = '24px Georgia, serif';
    ctx.fillText('Practice mock - CyberSkill', 600, 230);

    // Short ochre divider under the heading
    ctx.strokeStyle = OCHRE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(500, 270);
    ctx.lineTo(700, 270);
    ctx.stroke();

    // "Awarded to" label
    ctx.fillStyle = UMBER;
    ctx.font = '22px Georgia, serif';
    ctx.fillText('This practice result is awarded to', 600, 350);

    // Nickname
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillText(name, 600, 420);

    // Score
    ctx.font = 'bold 40px Georgia, serif';
    ctx.fillText(`${score} / 1000`, 600, 510);

    // Pass / fail line
    ctx.font = 'bold 30px Georgia, serif';
    ctx.fillStyle = UMBER;
    ctx.fillText(passed ? 'PASS' : 'Did not pass', 600, 565);

    // Date
    ctx.fillStyle = UMBER;
    ctx.font = '22px Georgia, serif';
    ctx.fillText(formatDate(dateISO), 600, 625);

    // Ochre seal
    ctx.beginPath();
    ctx.arc(600, 685, 26, 0, Math.PI * 2);
    ctx.fillStyle = OCHRE;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = UMBER;
    ctx.stroke();

    // Footer
    ctx.fillStyle = UMBER;
    ctx.font = '16px Georgia, serif';
    ctx.fillText('Unofficial practice result - cyberskill.world', 600, 738);

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'claude-architect-foundations-certificate.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleLinkedIn = () => {
    const shareUrl =
      'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(SITE_URL);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleDownload}
        className="bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-md inline-flex items-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
      >
        <Download className="w-4 h-4" /> Download certificate
      </button>
      <button
        onClick={handleLinkedIn}
        className="surface-panel text-foreground hover:border-ring font-medium px-4 py-2.5 rounded-md inline-flex items-center gap-2 transition-colors"
      >
        <Share2 className="w-4 h-4" /> Share on LinkedIn
      </button>
    </div>
  );
}
