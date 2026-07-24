/**
 * Live AI tutor with hard cost caps (AI-001).
 * Kill switch: TUTOR_ENABLED=off|on (default off).
 * Ladder: pregenerated → shared cache → live (cheap model). Caps fail closed.
 */
import 'server-only';
import { metrics } from '@opentelemetry/api';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { TUTOR_SYSTEM_PROMPT, SYSTEM_PROMPT_VERSION } from '@/lib/tutorPrompt';

export type TutorIntent = 'explain_concept' | 'why_wrong' | 'walk_through' | 'related_concept';

export const TUTOR_INTENTS: readonly TutorIntent[] = [
  'explain_concept',
  'why_wrong',
  'walk_through',
  'related_concept',
] as const;

export function isTutorIntent(v: string): v is TutorIntent {
  return (TUTOR_INTENTS as readonly string[]).includes(v);
}

/** Operator-tunable ceilings (mechanism normative; amounts are launch config). */
export const TUTOR_CONFIG = {
  model: process.env.TUTOR_MODEL || 'cheap-class',
  maxOutputTokens: Number(process.env.TUTOR_MAX_OUTPUT_TOKENS || 512),
  userDailyTokens: Number(process.env.TUTOR_USER_DAILY_TOKENS || 20_000),
  userDailyRequests: Number(process.env.TUTOR_USER_DAILY_REQUESTS || 40),
  /** Estimated USD from ledger tokens × unit price — circuit breaker only. */
  globalDailyUsd: Number(process.env.TUTOR_GLOBAL_DAILY_USD || 25),
  usdPer1kTokens: Number(process.env.TUTOR_USD_PER_1K_TOKENS || 0.15),
  cooldownMinutes: Number(process.env.TUTOR_ABUSE_COOLDOWN_MINUTES || 15),
  systemPromptVersion: SYSTEM_PROMPT_VERSION,
};

export type TutorRequest = {
  userId: string;
  sittingId: string;
  itemId: string;
  intent: TutorIntent;
  question?: string;
  phase: 'pre_grade' | 'post_grade';
  /** Exam mode in progress — tutor must refuse. */
  examInProgress?: boolean;
  examCode?: string;
};

export type TutorAnswer = {
  rung: 'pregenerated' | 'cache' | 'live';
  answer: string;
  remainingToday: { tokens: number; requests: number };
};

export type TutorDegraded = { degraded: true; reason: string };

export type TutorProvider = {
  complete(
    prompt: string,
    opts: { maxOutputTokens: number; requestId: string }
  ): Promise<{ text: string; tokensIn: number; tokensOut: number }>;
};

const meter = metrics.getMeter('ccaf.ai');
const served = meter.createCounter('ai.tutor_served');
const capped = meter.createCounter('ai.tutor_capped');
const abuse = meter.createCounter('ai.tutor_abuse_suspected');
const cacheHits = meter.createCounter('ai.tutor_cache_hit');
const cacheMisses = meter.createCounter('ai.tutor_cache_miss');

/** In-memory abuse cooldowns (speed bump; ledger is the budget source of truth). */
const cooldowns = new Map<string, number>();
const recentIntents = new Map<string, { intent: string; at: number }[]>();

let injectedProvider: TutorProvider | null = null;

export function setTutorProviderForTests(p: TutorProvider | null): void {
  injectedProvider = p;
}

export function tutorEnabled(): boolean {
  return (process.env.TUTOR_ENABLED || 'off').toLowerCase() === 'on';
}

export function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export type PromptParts = {
  system: string;
  itemBlock: string;
  explanationsBlock: string;
  userWrapped: string;
  includeAnswerKey: boolean;
  fullPrompt: string;
};

export function assemblePrompt(input: {
  stem: string;
  options: { key: string; text: string }[];
  explanations: Record<string, string> | null;
  correctKey: string | null;
  intent: TutorIntent;
  question: string | undefined;
  phase: 'pre_grade' | 'post_grade';
}): PromptParts {
  const includeAnswerKey = input.phase === 'post_grade';
  const optionsText = input.options.map((o) => `${o.key}. ${o.text}`).join('\n');
  const itemBlock = `ITEM STEM:\n${input.stem}\n\nOPTIONS:\n${optionsText}`;
  const explanationsBlock = input.explanations
    ? `PREGENERATED_EXPLANATIONS:\n${JSON.stringify(input.explanations)}`
    : 'PREGENERATED_EXPLANATIONS: (none)';
  const answerBlock =
    includeAnswerKey && input.correctKey
      ? `\nCORRECT_KEY: ${input.correctKey}`
      : '\nCORRECT_KEY: (withheld — pre_grade)';
  const q = (input.question || `intent:${input.intent}`).slice(0, 2000);
  const userWrapped = `<untrusted_user_question intent="${input.intent}">\n${q}\n</untrusted_user_question>`;
  const fullPrompt = [
    TUTOR_SYSTEM_PROMPT,
    itemBlock,
    explanationsBlock,
    answerBlock,
    userWrapped,
  ].join('\n\n');
  return {
    system: TUTOR_SYSTEM_PROMPT,
    itemBlock,
    explanationsBlock,
    userWrapped,
    includeAnswerKey,
    fullPrompt,
  };
}

function pregeneratedAnswer(
  intent: TutorIntent,
  explanations: Record<string, string> | null
): string | null {
  if (!explanations || Object.keys(explanations).length === 0) return null;
  const lines = Object.entries(explanations).map(([k, v]) => `**${k}:** ${v}`);
  if (intent === 'why_wrong' || intent === 'explain_concept' || intent === 'walk_through') {
    return [
      'From the pre-generated rationale for this item:',
      ...lines,
      '',
      '_Live follow-ups may be available when the tutor is enabled and within your daily budget._',
    ].join('\n');
  }
  // related_concept — still surface explanations as grounding
  return ['Related concepts from this item:', ...lines].join('\n');
}

async function defaultProvider(): Promise<TutorProvider> {
  if (injectedProvider) return injectedProvider;
  // Pluggable: no SDK import unless TUTOR_API_URL is set (HTTP complete).
  const url = process.env.TUTOR_API_URL;
  if (!url) {
    return {
      async complete() {
        throw new Error('no_provider_configured');
      },
    };
  }
  return {
    async complete(prompt, opts) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(process.env.TUTOR_API_KEY
            ? { authorization: `Bearer ${process.env.TUTOR_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          model: TUTOR_CONFIG.model,
          prompt,
          max_tokens: opts.maxOutputTokens,
          request_id: opts.requestId,
        }),
      });
      if (!res.ok) throw new Error(`provider_${res.status}`);
      const data = (await res.json()) as {
        text?: string;
        tokens_in?: number;
        tokens_out?: number;
      };
      return {
        text: data.text || '',
        tokensIn: data.tokens_in ?? Math.ceil(prompt.length / 4),
        tokensOut: data.tokens_out ?? Math.ceil((data.text || '').length / 4),
      };
    },
  };
}

function checkAbuse(userId: string, intent: TutorIntent): boolean {
  const now = Date.now();
  const until = cooldowns.get(userId) ?? 0;
  if (now < until) return true;
  const list = recentIntents.get(userId) ?? [];
  const windowed = list.filter((e) => now - e.at < 60_000);
  windowed.push({ intent, at: now });
  recentIntents.set(userId, windowed);
  const same = windowed.filter((e) => e.intent === intent).length;
  if (same >= 12 || windowed.length >= 30) {
    cooldowns.set(userId, now + TUTOR_CONFIG.cooldownMinutes * 60_000);
    try {
      abuse.add(1, { reason: 'rapid_fire' });
    } catch {
      /* ignore */
    }
    return true;
  }
  return false;
}

async function remainingBudget(userId: string): Promise<{ tokens: number; requests: number }> {
  if (!supabaseAdmin) return { tokens: 0, requests: 0 };
  const day = utcDay();
  const { data, error } = await supabaseAdmin
    .from('tutor_usage')
    .select('tokens_in, tokens_out, requests')
    .eq('user_id', userId)
    .eq('day', day)
    .maybeSingle();
  if (error) return { tokens: 0, requests: 0 };
  const used = (data?.tokens_in ?? 0) + (data?.tokens_out ?? 0);
  return {
    tokens: Math.max(0, TUTOR_CONFIG.userDailyTokens - used),
    requests: Math.max(0, TUTOR_CONFIG.userDailyRequests - (data?.requests ?? 0)),
  };
}

async function globalSpendTripped(): Promise<boolean> {
  if (!supabaseAdmin) return true; // fail closed
  const day = utcDay();
  const { data, error } = await supabaseAdmin
    .from('tutor_usage')
    .select('tokens_in, tokens_out')
    .eq('day', day);
  if (error) return true; // fail closed
  const tokens = (data ?? []).reduce(
    (s, r) => s + Number(r.tokens_in ?? 0) + Number(r.tokens_out ?? 0),
    0
  );
  const usd = (tokens / 1000) * TUTOR_CONFIG.usdPer1kTokens;
  return usd >= TUTOR_CONFIG.globalDailyUsd;
}

export async function askTutor(req: TutorRequest): Promise<TutorAnswer | TutorDegraded> {
  try {
    if (req.examInProgress) {
      return { degraded: true, reason: 'unavailable_during_exam' };
    }
    if (!tutorEnabled()) {
      return { degraded: true, reason: 'tutor_disabled' };
    }
    if (!isTutorIntent(req.intent)) {
      return { degraded: true, reason: 'invalid_intent' };
    }
    if (checkAbuse(req.userId, req.intent)) {
      try {
        capped.add(1, { level: 'abuse_cooldown' });
      } catch {
        /* ignore */
      }
      return { degraded: true, reason: 'abuse_cooldown' };
    }
    if (!supabaseAdmin) {
      return { degraded: true, reason: 'ledger_unavailable' };
    }

    const db = supabaseAdmin;
    const { data: item, error: iErr } = await db
      .from('items')
      .select('id, stem, options, explanations, correct_key, version')
      .eq('id', req.itemId)
      .maybeSingle();
    if (iErr || !item) {
      return { degraded: true, reason: 'item_not_found' };
    }

    const explanations = (item.explanations as Record<string, string> | null) ?? null;
    const options = (item.options as { key: string; text: string }[]) ?? [];

    // Rung 1 — pregenerated
    const pre = pregeneratedAnswer(req.intent, explanations);
    if (pre && !req.question?.trim()) {
      try {
        served.add(1, { rung: 'pregenerated' });
      } catch {
        /* ignore */
      }
      const rem = await remainingBudget(req.userId);
      return { rung: 'pregenerated', answer: pre, remainingToday: rem };
    }

    // Rung 2 — shared cache (closed intent key; never stores user question text)
    const { data: cached } = await db
      .from('tutor_cache')
      .select('answer')
      .eq('item_id', item.id)
      .eq('item_version', item.version)
      .eq('intent_key', req.intent)
      .maybeSingle();
    if (cached?.answer) {
      try {
        served.add(1, { rung: 'cache' });
        cacheHits.add(1);
      } catch {
        /* ignore */
      }
      const rem = await remainingBudget(req.userId);
      return { rung: 'cache', answer: cached.answer, remainingToday: rem };
    }
    try {
      cacheMisses.add(1);
    } catch {
      /* ignore */
    }

    // Live rung — fail closed on ledger / breaker errors
    let tripped = true;
    try {
      tripped = await globalSpendTripped();
    } catch {
      tripped = true;
    }
    if (tripped) {
      try {
        capped.add(1, { level: 'global_breaker' });
      } catch {
        /* ignore */
      }
      if (pre) {
        const rem = await remainingBudget(req.userId);
        return { rung: 'pregenerated', answer: pre, remainingToday: rem };
      }
      return { degraded: true, reason: 'live_tutor_back_tomorrow' };
    }

    const remBefore = await remainingBudget(req.userId);
    if (remBefore.tokens <= 0 || remBefore.requests <= 0) {
      try {
        capped.add(1, { level: 'user_daily' });
      } catch {
        /* ignore */
      }
      if (pre) {
        return { rung: 'pregenerated', answer: pre, remainingToday: remBefore };
      }
      return { degraded: true, reason: 'live_tutor_back_tomorrow' };
    }

    const parts = assemblePrompt({
      stem: item.stem,
      options,
      explanations,
      correctKey: item.correct_key,
      intent: req.intent,
      question: req.question,
      phase: req.phase,
    });

    // Deep isolation: never put email / raw user id in provider payload
    const requestId = `tut_${req.sittingId.slice(0, 8)}_${Date.now().toString(36)}`;
    const provider = await defaultProvider();
    let completion: { text: string; tokensIn: number; tokensOut: number };
    try {
      completion = await provider.complete(parts.fullPrompt, {
        maxOutputTokens: TUTOR_CONFIG.maxOutputTokens,
        requestId,
      });
    } catch {
      if (pre) {
        const rem = await remainingBudget(req.userId);
        return { rung: 'pregenerated', answer: pre, remainingToday: rem };
      }
      return { degraded: true, reason: 'provider_unavailable' };
    }

    // Atomic spend — if over budget, do not serve live answer as spent
    const { data: spentOk, error: spendErr } = await db.rpc('tutor_try_spend', {
      p_user_id: req.userId,
      p_day: utcDay(),
      p_tokens_in: completion.tokensIn,
      p_tokens_out: completion.tokensOut,
      p_max_tokens: TUTOR_CONFIG.userDailyTokens,
      p_max_requests: TUTOR_CONFIG.userDailyRequests,
    });
    if (spendErr || spentOk !== true) {
      try {
        capped.add(1, { level: spendErr ? 'ledger_error' : 'user_daily' });
      } catch {
        /* ignore */
      }
      if (pre) {
        const rem = await remainingBudget(req.userId);
        return { rung: 'pregenerated', answer: pre, remainingToday: rem };
      }
      return { degraded: true, reason: 'live_tutor_back_tomorrow' };
    }

    // Persist cache without user question text
    await db.from('tutor_cache').upsert(
      {
        item_id: item.id,
        item_version: item.version,
        intent_key: req.intent,
        answer: completion.text,
        model: TUTOR_CONFIG.model,
      },
      { onConflict: 'item_id,item_version,intent_key' }
    );

    try {
      served.add(1, { rung: 'live' });
    } catch {
      /* ignore */
    }
    const rem = await remainingBudget(req.userId);
    return { rung: 'live', answer: completion.text, remainingToday: rem };
  } catch {
    return { degraded: true, reason: 'tutor_error' };
  }
}

/** Estimate today's spend USD from ledger (observability). */
export async function estimateDailySpendUsd(): Promise<number | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from('tutor_usage')
    .select('tokens_in, tokens_out')
    .eq('day', utcDay());
  if (error) return null;
  const tokens = (data ?? []).reduce(
    (s, r) => s + Number(r.tokens_in ?? 0) + Number(r.tokens_out ?? 0),
    0
  );
  return (tokens / 1000) * TUTOR_CONFIG.usdPer1kTokens;
}
