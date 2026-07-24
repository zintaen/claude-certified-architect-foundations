/**
 * AEO/GEO helpers (GROWTH-002) — fact boxes, answer blocks, crawler policy.
 */
import type { ExamRegistryEntry } from '@/lib/examRegistry';
import { catalogExamCodes, examByCode, EXAM_REGISTRY } from '@/lib/examRegistry';
import { PSEO_INTENTS, pseoPath } from '@/lib/pseo';
import { DEFAULT_SITE_ORIGIN } from '@/lib/site';

export type FactBoxModel = {
  examCode: string;
  examName: string;
  priceUsd: number | null;
  delivery: string;
  validityMonths: number | null;
  itemCount: number;
  durationMinutes: number;
  retrieved: string;
  sourceUrl: string;
  verifyLine: string;
  independenceLine: string;
};

export type AnswerBlockModel = {
  question: string;
  answer: string;
};

/** Default: citation-friendly crawl on free surfaces; /api always disallowed separately. */
export const AI_CRAWLER_POLICY: { agent: string; allow: 'free_surfaces' | 'none' }[] = [
  { agent: 'GPTBot', allow: 'free_surfaces' },
  { agent: 'ChatGPT-User', allow: 'free_surfaces' },
  { agent: 'ClaudeBot', allow: 'free_surfaces' },
  { agent: 'anthropic-ai', allow: 'free_surfaces' },
  { agent: 'PerplexityBot', allow: 'free_surfaces' },
  { agent: 'Google-Extended', allow: 'free_surfaces' },
  { agent: 'CCBot', allow: 'none' },
];

export function factBox(exam: ExamRegistryEntry): FactBoxModel {
  return {
    examCode: exam.code,
    examName: exam.name,
    priceUsd: exam.logistics.price_usd,
    delivery: exam.logistics.delivery,
    validityMonths: exam.logistics.validity_months,
    itemCount: exam.logistics.item_count,
    durationMinutes: exam.logistics.duration_minutes,
    retrieved: exam.logistics.retrieved,
    sourceUrl: exam.logistics.source_url,
    verifyLine: 'Always verify current registration details with the exam vendor before booking.',
    independenceLine:
      'CyberSkill is an independent practice site and is not affiliated with the exam vendor.',
  };
}

export function answerBlock(question: string, answer: string): AnswerBlockModel {
  return { question, answer };
}

export function buildLlmsTxt(siteOrigin = DEFAULT_SITE_ORIGIN): string {
  const lines: string[] = [
    '# CyberSkill — independent certification practice exams',
    '# Original, blueprint-derived practice content. Not affiliated with any vendor.',
    '# Content integrity: free samples only; no answer keys in crawlable dumps; no dumps marketplace.',
    '#',
    `> ${factBox(EXAM_REGISTRY[0]!).independenceLine}`,
    '',
  ];

  for (const exam of EXAM_REGISTRY) {
    lines.push(`## ${exam.name} (${exam.code})`);
    if (exam.legacyCanonical) {
      lines.push(`- Home / free mock: ${siteOrigin}/`);
      lines.push(`- Sample questions: ${siteOrigin}/sample-questions`);
      lines.push(`- Guide: ${siteOrigin}/guide`);
      lines.push(`- FAQ: ${siteOrigin}/faq`);
    } else {
      lines.push(`- Landing: ${siteOrigin}/exams/${exam.code}`);
      for (const intent of PSEO_INTENTS) {
        lines.push(`- ${intent}: ${siteOrigin}${pseoPath(exam.code, intent)}`);
      }
      lines.push(`- Sample questions: ${siteOrigin}${exam.sampleHref}`);
    }
    lines.push('');
  }

  lines.push('## Site map');
  lines.push(`- Exams index: ${siteOrigin}/exams`);
  lines.push(`- Domains: ${siteOrigin}/domains`);
  lines.push(`- Privacy: ${siteOrigin}/privacy`);
  lines.push('');
  lines.push('# Regenerated from catalog — do not hand-edit.');
  return lines.join('\n');
}

export function catalogCodesForLlms(): string[] {
  return EXAM_REGISTRY.map((e) => e.code);
}

export function freeSurfacePaths(): string[] {
  const paths = ['/', '/guide', '/faq', '/domains', '/sample-questions', '/exams', '/about'];
  for (const code of catalogExamCodes()) {
    paths.push(`/exams/${code}`);
    for (const intent of PSEO_INTENTS) paths.push(pseoPath(code, intent));
    const exam = examByCode(code);
    if (exam) paths.push(exam.sampleHref);
  }
  return paths;
}
