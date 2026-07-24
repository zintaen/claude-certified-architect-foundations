/**
 * Programmatic SEO helpers (GROWTH-001).
 */
import { catalogExamCodes, examByCode } from '@/lib/examRegistry';
import { freePolicyForExam } from '@/lib/freePolicy';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type PseoIntent = 'practice-exam' | 'practice-questions' | 'free-mock-test';

export const PSEO_INTENTS: readonly PseoIntent[] = [
  'practice-exam',
  'practice-questions',
  'free-mock-test',
] as const;

/** Index threshold ≤ PAY-001 free_question_cap (default 30). */
export const PSEO_CONFIG = {
  minFreeItems: Number(process.env.PSEO_MIN_FREE_ITEMS || 12),
};

export type PseoPageState = {
  examCode: string;
  intent: PseoIntent;
  indexable: boolean;
  reasons: string[];
  freeItemsShown: number;
};

export type PseoFreeItem = {
  id: string;
  stem: string;
  options: { key: string; text: string }[];
  /** Never in initial HTML; client reveal only. */
  correctKey?: string;
};

export type LinkSet = { href: string; label: string }[];

export function pseoPath(examCode: string, intent: PseoIntent): string {
  return `/exams/${examCode}/${intent}`;
}

export function allPseoPaths(): string[] {
  return catalogExamCodes().flatMap((code) => PSEO_INTENTS.map((intent) => pseoPath(code, intent)));
}

export async function countPublicFreeItems(examCode: string): Promise<number> {
  const exam = examByCode(examCode);
  if (!exam) return 0;
  if (!supabaseAdmin) {
    // Without DB, treat registry item_count as unavailable → below threshold.
    return 0;
  }
  const { data: row } = await supabaseAdmin
    .from('exams')
    .select('id')
    .eq('code', examCode)
    .maybeSingle();
  if (!row?.id) return 0;
  const { count, error } = await supabaseAdmin
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('exam_id', row.id)
    .eq('item_status', 'scored');
  if (error) return 0;
  const cap = freePolicyForExam(examCode).free_question_cap;
  return Math.min(count ?? 0, cap);
}

export async function loadFreeItemsForPseo(
  examCode: string,
  limit: number
): Promise<PseoFreeItem[]> {
  if (!supabaseAdmin || limit <= 0) return [];
  const { data: exam } = await supabaseAdmin
    .from('exams')
    .select('id')
    .eq('code', examCode)
    .maybeSingle();
  if (!exam?.id) return [];
  const { data: items } = await supabaseAdmin
    .from('items')
    .select('id, stem, options, correct_key')
    .eq('exam_id', exam.id)
    .eq('item_status', 'scored')
    .order('id', { ascending: true })
    .limit(limit);
  return (items ?? []).map((i) => ({
    id: i.id as string,
    stem: i.stem as string,
    options: (i.options as { key: string; text: string }[]) ?? [],
    correctKey: i.correct_key as string,
  }));
}

export async function pseoState(examCode: string, intent: PseoIntent): Promise<PseoPageState> {
  const reasons: string[] = [];
  const exam = examByCode(examCode);
  if (!exam || exam.legacyCanonical) {
    return {
      examCode,
      intent,
      indexable: false,
      reasons: ['exam_not_in_catalog_namespace'],
      freeItemsShown: 0,
    };
  }
  const freeCount = await countPublicFreeItems(examCode);
  const cap = freePolicyForExam(examCode).free_question_cap;
  const shown = Math.min(freeCount, cap, 8);
  if (freeCount < PSEO_CONFIG.minFreeItems) {
    reasons.push(`free_items ${freeCount} < minFreeItems ${PSEO_CONFIG.minFreeItems}`);
  }
  // Section completeness: logistics always present from registry.
  if (!exam.logistics?.source_url) reasons.push('logistics incomplete');

  return {
    examCode,
    intent,
    indexable: reasons.length === 0,
    reasons,
    freeItemsShown: shown,
  };
}

export function internalLinks(examCode: string, intent: PseoIntent): LinkSet {
  const exam = examByCode(examCode);
  const links: LinkSet = [
    { href: '/exams', label: 'All exams' },
    { href: `/exams/${examCode}`, label: exam?.shortName ?? examCode },
  ];
  for (const i of PSEO_INTENTS) {
    if (i === intent) continue;
    links.push({
      href: pseoPath(examCode, i),
      label: i.replace(/-/g, ' '),
    });
  }
  for (const code of catalogExamCodes()) {
    if (code === examCode) continue;
    links.push({ href: `/exams/${code}`, label: examByCode(code)?.shortName ?? code });
  }
  links.push({ href: '/domains', label: 'Domains' });
  links.push({
    href: exam?.practiceHref ?? `/exams/${examCode}/practice`,
    label: 'Start practice',
  });
  return links;
}

export type VisibleContent = {
  title: string;
  faqs: { q: string; a: string }[];
  itemStems: string[];
};

export function schemaFor(state: PseoPageState, visible: VisibleContent): object[] {
  const graphs: object[] = [];
  if (visible.faqs.length > 0) {
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: visible.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  if (visible.itemStems.length > 0) {
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: visible.title,
      numberOfItems: visible.itemStems.length,
      itemListElement: visible.itemStems.map((name, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name,
      })),
    });
  }
  return graphs;
}

export function intentCopy(
  intent: PseoIntent,
  examName: string
): {
  h1: string;
  angle: string;
  cta: string;
} {
  switch (intent) {
    case 'practice-exam':
      return {
        h1: `${examName} practice exam`,
        angle:
          'Walk through how a full mock is structured: timing, domains, and how to use this free practice exam before you book.',
        cta: 'Start a practice sitting',
      };
    case 'practice-questions':
      return {
        h1: `${examName} practice questions (free)`,
        angle:
          'Browse free sample questions from the curated free set. Answer inline — answer keys stay off the initial HTML.',
        cta: 'Try more practice questions',
      };
    case 'free-mock-test':
      return {
        h1: `Free ${examName} mock test`,
        angle:
          'A free timed-style mock experience: one full attempt shape, honest logistics, and no claim of Anthropic administration.',
        cta: 'Take the free mock',
      };
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}
