/**
 * Legal constants — single source for vendor marks + independence wording (LEGAL-001 / SCALE-004).
 */

export const INDEPENDENCE_DISCLAIMER =
  'CyberSkill is an independent practice-exam resource and is neither affiliated with, nor authorized, sponsored, or approved by, Anthropic, PBC.';

/** Shorter line for OG / compact surfaces. */
export const INDEPENDENCE_DISCLAIMER_SHORT =
  'Independent practice resource — not affiliated with Anthropic, PBC.';

export type VendorKey = 'anthropic' | 'aws' | 'microsoft' | 'google';

export type VendorMarkEntry = {
  owner: string;
  marks: readonly string[];
};

export const VENDOR_MARKS: Record<VendorKey, VendorMarkEntry> = {
  anthropic: {
    owner: 'Anthropic, PBC',
    marks: [
      'Claude',
      'Claude Certified Associate - Foundations',
      'CCAO-F',
      'Claude Certified Developer - Foundations',
      'CCDV-F',
      'Claude Certified Architect - Foundations',
      'CCAR-F',
      'Claude Certified Architect - Professional',
      'CCAR-P',
    ],
  },
  aws: {
    owner: 'Amazon Web Services, Inc.',
    marks: ['AWS', 'Amazon Web Services', 'AWS Certified AI Practitioner', 'AIF-C01'],
  },
  microsoft: {
    owner: 'Microsoft Corporation',
    marks: ['Microsoft', 'Azure', 'Microsoft Azure AI Fundamentals', 'AI-900', 'AI-901'],
  },
  google: {
    owner: 'Google LLC',
    marks: ['Google', 'Google Cloud', 'Generative AI Leader'],
  },
};

/** Convenience exports for UI copy (avoids scattering mark literals). */
export const MARK_CLAUDE = VENDOR_MARKS.anthropic.marks[0];
export const MARK_CCAO_F_NAME = VENDOR_MARKS.anthropic.marks[1];
export const MARK_CCAO_F = VENDOR_MARKS.anthropic.marks[2];
export const MARK_CCDV_F_NAME = VENDOR_MARKS.anthropic.marks[3];
export const MARK_CCDV_F = VENDOR_MARKS.anthropic.marks[4];
export const MARK_CCAF_NAME = VENDOR_MARKS.anthropic.marks[5];
export const MARK_CCAF = VENDOR_MARKS.anthropic.marks[6];
export const MARK_CCAR_P_NAME = VENDOR_MARKS.anthropic.marks[7];
export const MARK_CCAR_P = VENDOR_MARKS.anthropic.marks[8];
export const MARK_OWNER_ANTHROPIC = VENDOR_MARKS.anthropic.owner;

export const MARK_AWS_AIF_NAME = VENDOR_MARKS.aws.marks[2];
export const MARK_AWS_AIF = VENDOR_MARKS.aws.marks[3];
export const MARK_AZURE_AI_NAME = VENDOR_MARKS.microsoft.marks[2];
export const MARK_AI_900 = VENDOR_MARKS.microsoft.marks[3];
export const MARK_GENAI_LEADER = VENDOR_MARKS.google.marks[2];

export function composeIndependenceDisclaimer(vendor: VendorKey = 'anthropic'): string {
  const owner = VENDOR_MARKS[vendor].owner;
  return `CyberSkill is an independent practice-exam resource and is neither affiliated with, nor authorized, sponsored, or approved by, ${owner}.`;
}

export function composeTrademarkNotice(
  marks: Record<string, VendorMarkEntry> = VENDOR_MARKS
): string {
  const lines: string[] = [];
  for (const entry of Object.values(marks)) {
    for (const mark of entry.marks) {
      lines.push(`${mark} is a trademark of ${entry.owner}.`);
    }
  }
  return lines.join(' ');
}

export const TRADEMARK_NOTICE = composeTrademarkNotice();

/** Banned as product self-descriptors (word-boundary). */
export const BANNED_DESCRIPTORS = [
  'official',
  'authorized',
  'authentic',
  'certified by',
  'endorsed',
  'approved by',
  'partner',
] as const;
