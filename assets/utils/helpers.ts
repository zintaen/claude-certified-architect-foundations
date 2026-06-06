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
  const total = all.length;
  const want: Record<string, number> = {};
  let assigned = 0;
  keys.forEach((k) => {
    const share = Math.round((buckets[k].length / total) * n);
    want[k] = Math.max(1, share);
    assigned += want[k];
  });
  
  while (assigned > n) {
    const k = keys.find((key) => want[key] > 1) || keys[0];
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
