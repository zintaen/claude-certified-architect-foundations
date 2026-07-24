/** Derive per-domain/objective targets from blueprint weights + cognitive mix. */
export function buildSpecMatrix(cfg, blueprintText) {
  const domains = [];
  const domainSection = blueprintText.match(/## Competency domains[\s\S]*?(?=## )/);
  const weightRows = [
    ...(domainSection?.[0].matchAll(/\|\s*\d+\s*\|\s*([^|]+)\|\s*(\d+)%/g) || []),
  ];
  for (const m of weightRows) {
    domains.push({ name: m[1].trim(), weight: Number(m[2]) });
  }
  if (!domains.length) {
    // Fallback to practice-site map weights
    domains.push(
      { name: 'Agentic Architecture & Orchestration', weight: 27 },
      { name: 'Tool Design & MCP Integration', weight: 18 },
      { name: 'Claude Code Configuration & Workflows', weight: 20 },
      { name: 'Prompt Engineering & Structured Output', weight: 20 },
      { name: 'Context Management & Reliability', weight: 15 }
    );
  }

  const objectives = [];
  const objBlocks = blueprintText.split(/### /).slice(1);
  for (const block of objBlocks) {
    const name = block.split('\n')[0].trim();
    const bullets = [...block.matchAll(/^- (.+)$/gm)].map((x) => x[1].trim());
    for (const b of bullets) objectives.push({ domain: name, text: b });
  }
  if (!objectives.length) {
    for (const d of domains) {
      objectives.push({ domain: d.name, text: `Apply ${d.name} judgment` });
    }
  }

  const total = cfg.targets.totalItems;
  const mix = cfg.cognitiveMix;
  const levels = [
    ...Array(Math.round(total * mix.recall)).fill('recall'),
    ...Array(Math.round(total * mix.application)).fill('application'),
    ...Array(
      Math.max(0, total - Math.round(total * mix.recall) - Math.round(total * mix.application))
    ).fill('analysis'),
  ];

  const weightSum = domains.reduce((s, d) => s + d.weight, 0);
  const perDomain = domains.map((d) => ({
    ...d,
    count: Math.max(1, Math.round((d.weight / weightSum) * total)),
  }));
  // Adjust to exact total
  let diff = total - perDomain.reduce((s, d) => s + d.count, 0);
  let i = 0;
  while (diff !== 0 && perDomain.length) {
    perDomain[i % perDomain.length].count += diff > 0 ? 1 : -1;
    if (perDomain[i % perDomain.length].count < 1) perDomain[i % perDomain.length].count = 1;
    diff = total - perDomain.reduce((s, d) => s + d.count, 0);
    i++;
    if (i > 1000) break;
  }

  const targets = [];
  let li = 0;
  for (const d of perDomain) {
    const objs = objectives.filter((o) => o.domain === d.name);
    const pool = objs.length ? objs : [{ domain: d.name, text: `Apply ${d.name}` }];
    for (let n = 0; n < d.count; n++) {
      const obj = pool[n % pool.length];
      targets.push({
        domain: d.name,
        objective: obj.text,
        cognitive: levels[li++ % levels.length],
        count: 1,
      });
    }
  }

  // Every objective receives at least one target when possible
  for (const obj of objectives) {
    if (!targets.some((t) => t.objective === obj.text)) {
      targets.push({
        domain: obj.domain,
        objective: obj.text,
        cognitive: 'application',
        count: 1,
      });
    }
  }

  return { domains: perDomain, targets, total: targets.length };
}
