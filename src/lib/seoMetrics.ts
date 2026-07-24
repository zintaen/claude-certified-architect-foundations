/**
 * SEO-001 metrics: contract-path 404 visibility.
 */
import { metrics } from '@opentelemetry/api';
import { isContractPath, pathClass } from '@/lib/urlContract';

const meter = metrics.getMeter('ccaf.seo');
const contract404 = meter.createCounter('seo.contract_404');

/** In-process probe counter for tests (OTel may be no-op in unit env). */
let probeCount = 0;

export function recordContract404(pathname: string): void {
  if (!isContractPath(pathname)) return;
  probeCount += 1;
  try {
    contract404.add(1, { path_class: pathClass(pathname) });
  } catch {
    /* metrics must never break 404 rendering */
  }
}

export function __contract404ProbeCount(): number {
  return probeCount;
}

export function __resetContract404Probe(): void {
  probeCount = 0;
}
