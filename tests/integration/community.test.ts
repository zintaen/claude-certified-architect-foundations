import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { classify } from '@/lib/rateLimit';

describe('GROWTH-004 community integration scaffolding', () => {
  it('API rate-classified', () => {
    expect(classify('/api/community/explanations', 'GET')).toBe('read');
    expect(classify('/api/community/explanations', 'POST')).toBe('write');
  });

  it('result page mounts community frame', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/result/page.tsx'), 'utf8');
    expect(src).toMatch(/CommunityExplanations/);
  });

  it('AUP mentions community channel', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/acceptable-use/page.tsx'), 'utf8');
    expect(src.toLowerCase()).toMatch(/community explanation/);
  });

  it('firewall: community bodies not imported by tutor/pipeline', () => {
    const tutor = readFileSync(join(process.cwd(), 'src/lib/tutor.ts'), 'utf8');
    expect(tutor).not.toMatch(/from ['\"]@\/lib\/community['\"]/);
    expect(tutor).not.toMatch(/community_explanations/);
    const prompt = readFileSync(join(process.cwd(), 'src/lib/tutorPrompt.ts'), 'utf8');
    expect(prompt).not.toMatch(/community/);
  });

  it('fences: no premium gate on community display; no reward coupling', () => {
    const comp = readFileSync(
      join(process.cwd(), 'src/components/CommunityExplanations.tsx'),
      'utf8'
    );
    expect(comp).not.toMatch(/enforcementOn|resolveAccess|UpgradePrompt/);
    const lib = readFileSync(join(process.cwd(), 'src/lib/community.ts'), 'utf8');
    expect(lib).not.toMatch(/grantEntitlement|referral/);
  });

  it('dashboard recognition surface', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
    expect(src).toMatch(/CommunityContributionCard/);
  });
});
