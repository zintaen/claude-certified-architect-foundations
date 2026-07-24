/**
 * Per-exam public logistics + practice defaults (CONTENT-003).
 * Anthropic program announcement confirms credential names + Pearson delivery.
 * Prices / item counts / validity / domain weights are guide-reported — always
 * show retrieval date and "verify with Anthropic" on landing pages.
 */
import {
  MARK_CCAF_NAME,
  MARK_CCAO_F_NAME,
  MARK_CCDV_F_NAME,
  MARK_CCAR_P_NAME,
  MARK_AWS_AIF_NAME,
  MARK_AZURE_AI_NAME,
  MARK_GENAI_LEADER,
  type VendorKey,
} from '@/lib/legal';

export type PassThresholdBasis = 'vendor_published' | 'site_default';

export type ExamLogistics = {
  price_usd: number | null;
  delivery: string;
  validity_months: number | null;
  source_url: string;
  retrieved: string;
  item_count: number;
  duration_minutes: number;
};

export type ExamRegistryEntry = {
  code: string;
  name: string;
  shortName: string;
  vendorKey: VendorKey;
  /** Legacy CCAF URLs stay canonical; no /exams/ccaf/* */
  legacyCanonical?: boolean;
  practiceHref: string;
  examHref: string;
  sampleHref: string;
  landingHref: string;
  blueprintDoc: string;
  logistics: ExamLogistics;
  pass_threshold: { value: number; basis: PassThresholdBasis };
  beta_mix_ratio: number;
};

const ANNOUNCE = 'https://claude.com/blog/four-role-based-claude-certifications';

export const EXAM_REGISTRY: ExamRegistryEntry[] = [
  {
    code: 'ccaf',
    name: MARK_CCAF_NAME,
    shortName: 'Architect Foundations',
    vendorKey: 'anthropic',
    legacyCanonical: true,
    practiceHref: '/practice',
    examHref: '/exam',
    sampleHref: '/sample-questions',
    landingHref: '/',
    blueprintDoc: 'docs/blueprints/ccaf-blueprint.md',
    logistics: {
      price_usd: 125,
      delivery: 'Pearson VUE (proctored)',
      validity_months: 12,
      source_url: ANNOUNCE,
      retrieved: '2026-07-24',
      item_count: 60,
      duration_minutes: 120,
    },
    pass_threshold: { value: 72, basis: 'site_default' },
    beta_mix_ratio: 1,
  },
  {
    code: 'ccao-f',
    name: MARK_CCAO_F_NAME,
    shortName: 'Associate Foundations',
    vendorKey: 'anthropic',
    practiceHref: '/exams/ccao-f/practice',
    examHref: '/exams/ccao-f/exam',
    sampleHref: '/exams/ccao-f/sample-questions',
    landingHref: '/exams/ccao-f',
    blueprintDoc: 'docs/blueprints/ccao-f-blueprint.md',
    logistics: {
      price_usd: 99,
      delivery: 'Pearson VUE (proctored)',
      validity_months: 12,
      source_url: ANNOUNCE,
      retrieved: '2026-07-24',
      item_count: 60,
      duration_minutes: 120,
    },
    pass_threshold: { value: 72, basis: 'site_default' },
    beta_mix_ratio: 1,
  },
  {
    code: 'ccdv-f',
    name: MARK_CCDV_F_NAME,
    shortName: 'Developer Foundations',
    vendorKey: 'anthropic',
    practiceHref: '/exams/ccdv-f/practice',
    examHref: '/exams/ccdv-f/exam',
    sampleHref: '/exams/ccdv-f/sample-questions',
    landingHref: '/exams/ccdv-f',
    blueprintDoc: 'docs/blueprints/ccdv-f-blueprint.md',
    logistics: {
      price_usd: 125,
      delivery: 'Pearson VUE (proctored)',
      validity_months: 12,
      source_url: ANNOUNCE,
      retrieved: '2026-07-24',
      item_count: 53,
      duration_minutes: 120,
    },
    pass_threshold: { value: 72, basis: 'site_default' },
    beta_mix_ratio: 1,
  },
  {
    code: 'ccar-p',
    name: MARK_CCAR_P_NAME,
    shortName: 'Architect Professional',
    vendorKey: 'anthropic',
    practiceHref: '/exams/ccar-p/practice',
    examHref: '/exams/ccar-p/exam',
    sampleHref: '/exams/ccar-p/sample-questions',
    landingHref: '/exams/ccar-p',
    blueprintDoc: 'docs/blueprints/ccar-p-blueprint.md',
    logistics: {
      price_usd: 175,
      delivery: 'Pearson VUE (proctored)',
      validity_months: 12,
      source_url: ANNOUNCE,
      retrieved: '2026-07-24',
      item_count: 63,
      duration_minutes: 120,
    },
    pass_threshold: { value: 72, basis: 'site_default' },
    beta_mix_ratio: 1,
  },
  {
    code: 'aws-aif-c01',
    name: MARK_AWS_AIF_NAME,
    shortName: 'AWS AI Practitioner',
    vendorKey: 'aws',
    practiceHref: '/exams/aws-aif-c01/practice',
    examHref: '/exams/aws-aif-c01/exam',
    sampleHref: '/exams/aws-aif-c01/sample-questions',
    landingHref: '/exams/aws-aif-c01',
    blueprintDoc: 'docs/blueprints/aws-aif-c01-blueprint.md',
    logistics: {
      price_usd: null,
      delivery: 'Pearson VUE / AWS Certification (verify at registration)',
      validity_months: null,
      source_url:
        'https://docs.aws.amazon.com/pdfs/aws-certification/latest/ai-practitioner-01/ai-practitioner-01.pdf',
      retrieved: '2026-07-24',
      item_count: 65,
      duration_minutes: 90,
    },
    pass_threshold: { value: 70, basis: 'site_default' },
    beta_mix_ratio: 1,
  },
  {
    code: 'azure-ai-900',
    name: MARK_AZURE_AI_NAME,
    shortName: 'Azure AI Fundamentals',
    vendorKey: 'microsoft',
    practiceHref: '/exams/azure-ai-900/practice',
    examHref: '/exams/azure-ai-900/exam',
    sampleHref: '/exams/azure-ai-900/sample-questions',
    landingHref: '/exams/azure-ai-900',
    blueprintDoc: 'docs/blueprints/azure-ai-900-blueprint.md',
    logistics: {
      price_usd: null,
      delivery: 'Pearson VUE / Microsoft (verify on Microsoft Learn)',
      validity_months: null,
      source_url: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/ai-900/',
      retrieved: '2026-07-24',
      item_count: 40,
      duration_minutes: 60,
    },
    pass_threshold: { value: 70, basis: 'site_default' },
    beta_mix_ratio: 1,
  },
  {
    code: 'google-genai-leader',
    name: MARK_GENAI_LEADER,
    shortName: 'Gen AI Leader',
    vendorKey: 'google',
    practiceHref: '/exams/google-genai-leader/practice',
    examHref: '/exams/google-genai-leader/exam',
    sampleHref: '/exams/google-genai-leader/sample-questions',
    landingHref: '/exams/google-genai-leader',
    blueprintDoc: 'docs/blueprints/google-genai-leader-blueprint.md',
    logistics: {
      price_usd: null,
      delivery: 'Google Cloud certification delivery (verify on cloud.google.com)',
      validity_months: null,
      source_url: 'https://cloud.google.com/learn/certification/generative-ai-leader',
      retrieved: '2026-07-24',
      item_count: 50,
      duration_minutes: 90,
    },
    pass_threshold: { value: 70, basis: 'site_default' },
    beta_mix_ratio: 1,
  },
];

export function examByCode(code: string): ExamRegistryEntry | undefined {
  return EXAM_REGISTRY.find((e) => e.code === code);
}

/** Codes that may appear under /exams/[code] (never ccaf). */
export function catalogExamCodes(): string[] {
  return EXAM_REGISTRY.filter((e) => !e.legacyCanonical).map((e) => e.code);
}
