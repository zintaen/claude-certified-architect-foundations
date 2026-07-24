/**
 * Sitting assembly + grading (service-role). Server routes only.
 */
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { examByCode } from '@/lib/catalog';
import { CANARIES, CANARY_PRACTICE_FREQUENCY, isCanary } from '@/data/canary.server';
import {
  countSubmittedExamMocks,
  enforcementOn,
  FreeMockLimitError,
  resolveAccess,
} from '@/lib/entitlements';
import { freePolicyForExam, pickFreeSubset } from '@/lib/freePolicy';

export type ServedQuestion = {
  id: string;
  domain: string;
  stem: string;
  options: { key: string; text: string }[];
  /** Internal only — stripped before HTTP responses. */
  _beta?: boolean;
};

export type GradeResult = {
  sittingId: string;
  score_pct: number;
  passed: boolean;
  correct: number;
  total_scored: number;
  breakdown: Record<string, unknown>;
  /** Per-item feedback; explanations only when premium or enforcement off. */
  items?: GradedItemFeedback[];
};

export type GradedItemFeedback = {
  id: string;
  correct_key: string;
  selected_key: string | null;
  is_correct: boolean;
  explanations?: Record<string, string> | null;
};

type QuestionSetEntry = { item_id: string; item_version: number; beta?: boolean };

function admin() {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin is not configured (SUPABASE_SERVICE_ROLE_KEY)');
  }
  return supabaseAdmin;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Assemble a sitting. Exam mode: scored items (+ optional unscored beta mix).
 * Canary and retired never appear in exam mode.
 * PAY-001: when ENTITLEMENTS_ENFORCED=on, free tier gets stable practice subset
 * and exam-mode mock count limit.
 */
export async function assembleSitting(input: {
  examCode: string;
  mode: 'exam' | 'practice';
  userId?: string;
  betaMix?: number;
}): Promise<{ sittingId: string; questions: ServedQuestion[]; durationMinutes: number }> {
  const exam = await examByCode(input.examCode);
  if (!exam) throw new Error(`exam not found or not live: ${input.examCode}`);

  const access = enforcementOn()
    ? await resolveAccess(input.userId ?? null, input.examCode)
    : { tier: 'premium' as const, grants: [] };
  const policy = freePolicyForExam(input.examCode);

  if (enforcementOn() && access.tier === 'free' && input.mode === 'exam' && input.userId) {
    const used = await countSubmittedExamMocks(input.userId, exam.id);
    if (used >= policy.free_full_mocks) {
      throw new FreeMockLimitError(input.examCode, used);
    }
  }

  const db = admin();
  const { data: items, error } = await db
    .from('items')
    .select('id, stem, options, item_status, version, domain_id')
    .eq('exam_id', exam.id)
    .in('item_status', input.mode === 'exam' ? ['scored', 'beta'] : ['scored', 'beta', 'canary']);
  if (error) throw error;

  const domainIds = [...new Set((items ?? []).map((i) => i.domain_id))];
  const { data: domains, error: dErr } = await db
    .from('domains')
    .select('id, key')
    .in('id', domainIds);
  if (dErr) throw dErr;
  const domainKey = new Map((domains ?? []).map((d) => [d.id, d.key]));

  let scored = (items ?? []).filter((i) => i.item_status === 'scored');
  // Free practice: stable curated subset (content boundary, not a meter).
  if (enforcementOn() && access.tier === 'free' && input.mode === 'practice') {
    scored = pickFreeSubset(scored, policy.free_question_cap);
  }

  const beta = (items ?? []).filter((i) => i.item_status === 'beta');
  const target =
    enforcementOn() && access.tier === 'free' && input.mode === 'practice'
      ? Math.min(exam.question_count, policy.free_question_cap, scored.length)
      : exam.question_count;
  const betaMix = Math.max(
    0,
    input.betaMix ?? Math.min(5, Math.round(Number(exam.beta_mix_ratio ?? 0)))
  );

  let picked =
    enforcementOn() && access.tier === 'free' && input.mode === 'practice'
      ? scored.slice(0, target) // already stable-ordered; do not reshuffle subset identity
      : shuffle(scored).slice(0, target);
  if (picked.length < target && input.mode === 'practice' && access.tier !== 'free') {
    picked = shuffle(items ?? []).slice(0, target);
  }
  const betas = enforcementOn() && access.tier === 'free' ? [] : shuffle(beta).slice(0, betaMix);

  const served = [...picked, ...betas].map((i) => {
    const options = (i.options as { key: string; text: string }[]).map((o) => ({
      key: o.key,
      text: o.text,
    }));
    return {
      id: i.id,
      domain: domainKey.get(i.domain_id) ?? '',
      stem: i.stem,
      options,
      _beta: i.item_status === 'beta',
      version: i.version,
    };
  });

  const ordered =
    enforcementOn() && access.tier === 'free' && input.mode === 'practice'
      ? served
      : shuffle(served);

  // SEC-001: low-frequency canary mix into practice only (never exam / scored).
  if (input.mode === 'practice' && Math.random() < CANARY_PRACTICE_FREQUENCY) {
    const pick = CANARIES[Math.floor(Math.random() * CANARIES.length)];
    if (pick && !ordered.some((q) => q.id === pick.id)) {
      const insertAt = Math.floor(Math.random() * (ordered.length + 1));
      ordered.splice(insertAt, 0, {
        id: pick.item.id,
        domain: pick.item.group,
        stem: pick.item.text,
        options: pick.item.options.map((o) => ({ key: o.letter, text: o.text })),
        _beta: false,
        version: 1,
      });
    }
  }

  const question_set: QuestionSetEntry[] = ordered.map((q) => ({
    item_id: q.id,
    item_version: q.version,
    beta: q._beta === true,
  }));

  const { data: sitting, error: sErr } = await db
    .from('sittings')
    .insert({
      user_id: input.userId ?? null,
      exam_id: exam.id,
      mode: input.mode,
      question_set,
    })
    .select('id')
    .single();
  if (sErr) throw sErr;

  const questions: ServedQuestion[] = ordered.map(({ id, domain, stem, options, _beta }) => ({
    id,
    domain,
    stem,
    options,
    ...(_beta ? { _beta: true } : {}),
  }));

  return {
    sittingId: sitting.id,
    questions,
    durationMinutes: exam.duration_minutes,
  };
}

/** Strip internal flags before sending to clients. */
export function toClientQuestions(questions: ServedQuestion[]): Omit<ServedQuestion, '_beta'>[] {
  return questions.map(({ id, domain, stem, options }) => ({ id, domain, stem, options }));
}

export async function recordResponse(
  sittingId: string,
  itemId: string,
  selectedKey: string | null,
  elapsedMs: number
): Promise<void> {
  const db = admin();
  const { data: sitting, error } = await db
    .from('sittings')
    .select('question_set')
    .eq('id', sittingId)
    .single();
  if (error) throw error;
  const set = sitting.question_set as QuestionSetEntry[];
  const entry = set.find((e) => e.item_id === itemId);
  if (!entry) throw new Error('item not in sitting question_set');

  const { data: item, error: iErr } = await db
    .from('items')
    .select('correct_key, version')
    .eq('id', itemId)
    .single();
  if (iErr) throw iErr;

  const isCorrect = selectedKey !== null && selectedKey === item.correct_key;

  const { error: rErr } = await db.from('item_responses').insert({
    sitting_id: sittingId,
    item_id: itemId,
    item_version: entry.item_version,
    selected_key: selectedKey,
    is_correct: isCorrect,
    elapsed_ms: elapsedMs,
  });
  if (rErr) throw rErr;
}

/**
 * Grade against the persisted question_set. Beta entries are excluded from score_pct.
 * PAY-001: explanations included only when enforcement off or premium.
 */
export async function gradeSitting(
  sittingId: string,
  opts?: { userId?: string | null; examCode?: string }
): Promise<GradeResult> {
  const db = admin();
  const { data: sitting, error } = await db
    .from('sittings')
    .select('id, question_set, exam_id, user_id')
    .eq('id', sittingId)
    .single();
  if (error) throw error;

  const { data: examRow, error: eErr } = await db
    .from('exams')
    .select('pass_threshold_pct, code')
    .eq('id', sitting.exam_id)
    .single();
  if (eErr) throw eErr;

  const set = sitting.question_set as QuestionSetEntry[];
  const ids = set.map((e) => e.item_id);
  const { data: items, error: iErr } = await db
    .from('items')
    .select('id, correct_key, version, domain_id, explanations')
    .in('id', ids);
  if (iErr) throw iErr;
  const byId = new Map((items ?? []).map((i) => [i.id, i]));

  const { data: existing } = await db
    .from('item_responses')
    .select('item_id, selected_key')
    .eq('sitting_id', sittingId);
  const answers = new Map(
    (existing ?? []).map((r) => [r.item_id, r.selected_key as string | null])
  );

  let correct = 0;
  let scoredTotal = 0;
  const rows: {
    sitting_id: string;
    item_id: string;
    item_version: number;
    selected_key: string | null;
    is_correct: boolean;
    elapsed_ms: number | null;
  }[] = [];

  for (const entry of set) {
    if (isCanary(entry.item_id)) continue;
    const item = byId.get(entry.item_id);
    if (!item) continue;
    const selected = answers.has(entry.item_id) ? answers.get(entry.item_id)! : null;
    const isCorrect = selected !== null && selected === item.correct_key;
    if (!entry.beta) {
      scoredTotal += 1;
      if (isCorrect) correct += 1;
    }
    rows.push({
      sitting_id: sittingId,
      item_id: entry.item_id,
      item_version: entry.item_version,
      selected_key: selected,
      is_correct: isCorrect,
      elapsed_ms: null,
    });
  }

  await db.from('item_responses').delete().eq('sitting_id', sittingId);
  if (rows.length) {
    const { error: insErr } = await db.from('item_responses').insert(rows);
    if (insErr) throw insErr;
  }

  const score_pct = scoredTotal === 0 ? 0 : Math.round((correct / scoredTotal) * 10000) / 100;
  const passThreshold = Number(examRow.pass_threshold_pct);
  const passed = score_pct >= passThreshold;
  const breakdown = { correct, scoredTotal, betaExcluded: set.filter((e) => e.beta).length };

  const { error: uErr } = await db
    .from('sittings')
    .update({
      submitted_at: new Date().toISOString(),
      score_pct,
      passed,
      breakdown,
    })
    .eq('id', sittingId);
  if (uErr) throw uErr;

  const userId = opts?.userId ?? sitting.user_id;
  const examCode = opts?.examCode ?? (examRow.code as string);
  const access = enforcementOn()
    ? await resolveAccess(userId ?? null, examCode)
    : { tier: 'premium' as const, grants: [] };
  const includeExplanations = !enforcementOn() || access.tier === 'premium';

  const feedback: GradedItemFeedback[] = rows.map((r) => {
    const item = byId.get(r.item_id)!;
    const base: GradedItemFeedback = {
      id: r.item_id,
      correct_key: item.correct_key,
      selected_key: r.selected_key,
      is_correct: r.is_correct,
    };
    if (includeExplanations) {
      base.explanations = (item.explanations as Record<string, string> | null) ?? null;
    }
    return base;
  });

  return {
    sittingId,
    score_pct,
    passed,
    correct,
    total_scored: scoredTotal,
    breakdown,
    items: feedback,
  };
}
