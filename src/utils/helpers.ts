export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleByGroup(items: any[]): any[] {
  const groups: Record<string, any[]> = {};
  items.forEach((q) => {
    (groups[q.group || 'misc'] = groups[q.group || 'misc'] || []).push(q);
  });
  const groupOrder = shuffle(Object.keys(groups));
  const out: any[] = [];
  groupOrder.forEach((g) => shuffle(groups[g]).forEach((q) => out.push(q)));
  return out;
}

export function pickProportional(all: any[], n: number): any[] {
  if (n >= all.length) return shuffleByGroup(all);
  const buckets: Record<string, any[]> = {};
  all.forEach((q) => {
    (buckets[q.group || 'misc'] = buckets[q.group || 'misc'] || []).push(q);
  });
  const keys = Object.keys(buckets);

  if (n < keys.length) {
    // If n is smaller than the number of groups, just pick n random questions
    return shuffle(all).slice(0, n);
  }

  const total = all.length;
  const want: Record<string, number> = {};
  let assigned = 0;
  keys.forEach((k) => {
    const share = Math.round((buckets[k].length / total) * n);
    want[k] = Math.max(1, share);
    assigned += want[k];
  });

  while (assigned > n) {
    const k = keys.find((key) => want[key] > 1) || keys.find((key) => want[key] > 0);
    if (!k) break;
    want[k]--;
    assigned--;
  }
  while (assigned < n) {
    const k = keys.reduce(
      (best: string | null, key) =>
        want[key] < buckets[key].length && (!best || buckets[key].length > buckets[best].length)
          ? key
          : best,
      null
    );
    if (!k) break;
    want[k]++;
    assigned++;
  }
  const groupOrder = shuffle(keys);
  const out: any[] = [];
  groupOrder.forEach((k) =>
    shuffle(buckets[k])
      .slice(0, want[k])
      .forEach((q) => out.push(q))
  );
  return out;
}

export function sessionId(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CCAF-${t.slice(-5)}-${r}`;
}

export function fmtTime(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function generateRadarSVG(
  domainStats: Record<string, any>,
  labelsMap: Record<string, string>
): string {
  const keys = Object.keys(domainStats);
  const N = keys.length;
  if (N < 3) return ''; // Radar needs at least 3 axes

  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 100;

  // Grid Rings
  let gridHtml = '';
  for (let level = 1; level <= 5; level++) {
    const r = (radius / 5) * level;
    let points = [];
    for (let i = 0; i < N; i++) {
      const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      points.push(`${px},${py}`);
    }
    gridHtml += `<polygon points="${points.join(' ')}" fill="none" class="radar-grid" stroke="var(--line)" stroke-width="1" />`;
  }

  // Axes and Labels
  let axesHtml = '';
  let labelsHtml = '';
  let dataPoints = [];

  keys.forEach((key, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;

    // Axis line
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    axesHtml += `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" class="radar-axis" stroke="var(--line)" stroke-width="1" />`;

    // Label
    const labelRadius = radius + 25;
    const lx = cx + labelRadius * Math.cos(angle);
    const ly = cy + labelRadius * Math.sin(angle);
    const label = labelsMap[key] || key;

    // Clean up label (wrap if too long)
    const words = label.split(' ');
    const shortLabel = words.length > 2 ? words.slice(0, 2).join(' ') + '...' : label;

    let anchor = 'middle';
    if (Math.abs(Math.cos(angle)) > 0.1) {
      anchor = Math.cos(angle) > 0 ? 'start' : 'end';
    }

    labelsHtml += `<text x="${lx}" y="${ly}" class="radar-label" text-anchor="${anchor}" dominant-baseline="middle" fill="var(--ink)" font-size="12px" font-weight="500">${shortLabel}</text>`;

    // Data Point
    const stat = domainStats[key];
    const pct = stat.total ? stat.correct / stat.total : 0;
    const dpRadius = radius * pct;
    const dx = cx + dpRadius * Math.cos(angle);
    const dy = cy + dpRadius * Math.sin(angle);
    dataPoints.push(`${dx},${dy}`);

    // Add dot
    axesHtml += `<circle cx="${dx}" cy="${dy}" r="4" fill="var(--brand)" class="radar-dot" style="animation: popIn 0.5s ease backwards; animation-delay: ${0.1 * i}s;" />`;
  });

  const polygonHtml = `<polygon points="${dataPoints.join(' ')}" class="radar-polygon" fill="var(--brand)" fill-opacity="0.3" stroke="var(--brand)" stroke-width="2" style="animation: fadeIn 1s ease backwards;" />`;

  return `
    <svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" style="overflow: visible; max-width: 400px; margin: 0 auto; display: block;">
      ${gridHtml}
      ${axesHtml}
      ${polygonHtml}
      ${labelsHtml}
    </svg>
  `;
}

export async function hashPIN(pin: string): Promise<string | null> {
  if (!pin) return null;
  if (!/^\d{6}$/.test(pin)) return null;
  const msgBuffer = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
