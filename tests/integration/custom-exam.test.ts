import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('LEARN-005 custom exam integration scaffolding', () => {
  it('practice page mounts builder', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/practice/page.tsx'), 'utf8');
    expect(src).toMatch(/CustomExamBuilder/);
  });

  it('analytics event present; no per-question props', () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/analytics.ts'), 'utf8');
    expect(src).toMatch(/custom_exam_built/);
    const block = src.slice(
      src.indexOf('custom_exam_built'),
      src.indexOf('custom_exam_built') + 200
    );
    expect(block).not.toMatch(/item_id|correct/);
  });

  it('fence: no LLM; uses engine itemIds path', () => {
    const lib = readFileSync(join(process.cwd(), 'src/lib/customExam.ts'), 'utf8');
    expect(lib).not.toMatch(/openai|@ai-sdk/i);
    const ui = readFileSync(join(process.cwd(), 'src/components/CustomExamBuilder.tsx'), 'utf8');
    expect(ui).toMatch(/itemIds/);
    expect(ui).toMatch(/Run again/);
  });
});
