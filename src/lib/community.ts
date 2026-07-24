/**
 * Community explanations (GROWTH-004).
 *
 * Config:
 * - maxBodyChars (default 1200)
 * - flagStayVisible: flagged approved items stay visible pending re-review (default true)
 *
 * Firewall: this module is the ONLY reader/writer of community_* tables.
 * Never import community bodies into tutor/pipeline/item paths.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { metrics } from '@opentelemetry/api';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const COMMUNITY_CONFIG = {
  maxBodyChars: Number(process.env.COMMUNITY_MAX_BODY_CHARS || 1200),
  /** When true, flagged approved explanations stay visible until operator re-review. */
  flagStayVisible: (process.env.COMMUNITY_FLAG_STAY_VISIBLE || 'true').toLowerCase() !== 'false',
};

const meter = metrics.getMeter('ccaf.community');
const submittedCounter = meter.createCounter('community.explanation.submitted');
const approvedCounter = meter.createCounter('community.explanation.approved');
const rejectedCounter = meter.createCounter('community.explanation.rejected');
const flaggedCounter = meter.createCounter('community.explanation.flagged');
const queueDepthGauge = meter.createObservableGauge('community.moderation.queue_depth');

let queueDepthCached = 0;
queueDepthGauge.addCallback((obs) => {
  obs.observe(queueDepthCached);
});

function admin() {
  if (!supabaseAdmin) throw new Error('supabaseAdmin required');
  return supabaseAdmin;
}

export function hashItemId(itemId: string): string {
  return createHash('sha256').update(itemId).digest('hex').slice(0, 16);
}

/** Strip tags / scripts; plain text only for display. */
export function sanitizeCommunityBody(raw: string): string {
  let s = raw.replace(/\0/g, '');
  s = s.replace(/<[^>]*>/g, '');
  s = s.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
  s = s.replace(/<[^>]*>/g, '');
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  return s.trim().slice(0, COMMUNITY_CONFIG.maxBodyChars);
}

/** Heuristic highlight for moderators (judgment stays human). */
export function recallPatternHits(body: string): string[] {
  const hits: string[] = [];
  const lower = body.toLowerCase();
  const patterns: [RegExp, string][] = [
    [/\bon the (actual|real) exam\b/i, 'actual/real exam recall'],
    [/\bbrain\s*dump\b/i, 'brain dump'],
    [/\bverbatim (from|of) the exam\b/i, 'verbatim exam'],
    [/\bNDA\b/, 'NDA mention'],
    [/\bi (saw|got|remember) this (exact )?question\b/i, 'remembered question'],
  ];
  for (const [re, label] of patterns) {
    if (re.test(lower) || re.test(body)) hits.push(label);
  }
  return hits;
}

export type CommunityExplanation = {
  id: string;
  itemId: string;
  itemVersion: number;
  bodySanitized: string;
  authorHandle: string;
  createdAt: string;
  votes: number;
  versionMismatch?: boolean;
};

async function userAnsweredItem(userId: string, email: string, itemId: string): Promise<boolean> {
  const db = admin();

  const { data: sittings } = await db
    .from('sittings')
    .select('id')
    .eq('user_id', userId)
    .not('submitted_at', 'is', null)
    .limit(30);
  const sittingIds = (sittings ?? []).map((s) => s.id as string);
  if (sittingIds.length) {
    const { data: responses } = await db
      .from('item_responses')
      .select('id')
      .eq('item_id', itemId)
      .in('sitting_id', sittingIds)
      .limit(1);
    if (responses && responses.length > 0) return true;
  }

  // Legacy CCAF: exam_results.breakdown.items[].id + chosenLetter
  const legacy = db as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          col: string,
          val: string
        ) => {
          order: (
            col: string,
            opts: { ascending: boolean }
          ) => {
            limit: (n: number) => Promise<{ data: Array<{ breakdown: unknown }> | null }>;
          };
        };
      };
    };
  };
  const { data: rows } = await legacy
    .from('exam_results')
    .select('breakdown')
    .eq('email', email)
    .order('completed_at', { ascending: false })
    .limit(20);
  for (const row of rows ?? []) {
    const breakdown = row.breakdown as {
      items?: Array<{ id?: string; chosenLetter?: string | null }>;
    } | null;
    const hit = breakdown?.items?.find((it) => it.id === itemId && it.chosenLetter);
    if (hit) return true;
  }
  return false;
}

export type SubmitResult =
  | 'pending'
  | 'rejected_not_answered'
  | 'rejected_duplicate'
  | 'rejected_length'
  | 'rejected_empty';

export async function submitExplanation(input: {
  userId: string;
  email: string;
  itemId: string;
  itemVersion?: number;
  body: string;
}): Promise<SubmitResult> {
  const body = sanitizeCommunityBody(input.body);
  if (!body) return 'rejected_empty';
  if (input.body.trim().length > COMMUNITY_CONFIG.maxBodyChars) return 'rejected_length';

  const answered = await userAnsweredItem(input.userId, input.email, input.itemId);
  if (!answered) return 'rejected_not_answered';

  const db = admin();
  const { data: pending } = await db
    .from('community_explanations')
    .select('id')
    .eq('author_user_id', input.userId)
    .eq('item_id', input.itemId)
    .eq('status', 'pending')
    .maybeSingle();
  if (pending) return 'rejected_duplicate';

  const { error } = await db.from('community_explanations').insert({
    item_id: input.itemId,
    item_version: input.itemVersion ?? 1,
    author_user_id: input.userId,
    body, // stored sanitized plain text
    status: 'pending',
  });
  if (error) {
    if (String(error.message).includes('community_explanations_one_pending')) {
      return 'rejected_duplicate';
    }
    throw error;
  }
  submittedCounter.add(1);
  queueDepthCached += 1;
  return 'pending';
}

export async function approvedFor(
  itemId: string,
  currentVersion?: number
): Promise<CommunityExplanation[]> {
  const db = admin();
  const { data: rows } = await db
    .from('community_explanations')
    .select('id, item_id, item_version, body, author_user_id, created_at')
    .eq('item_id', itemId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id as string);
  const { data: votes } = await db
    .from('explanation_votes')
    .select('explanation_id')
    .in('explanation_id', ids);
  const voteMap = new Map<string, number>();
  for (const v of votes ?? []) {
    const id = v.explanation_id as string;
    voteMap.set(id, (voteMap.get(id) ?? 0) + 1);
  }

  const authorIds = [...new Set(rows.map((r) => r.author_user_id as string))];
  const { data: authors } = await db.from('users').select('id, email').in('id', authorIds);
  const handleMap = new Map<string, string>();
  for (const a of authors ?? []) {
    const email = a.email as string;
    const local = email.split('@')[0] || 'learner';
    handleMap.set(a.id as string, local.slice(0, 24));
  }

  const out: CommunityExplanation[] = rows.map((r) => ({
    id: r.id as string,
    itemId: r.item_id as string,
    itemVersion: r.item_version as number,
    bodySanitized: sanitizeCommunityBody(r.body as string),
    authorHandle: handleMap.get(r.author_user_id as string) || 'learner',
    createdAt: r.created_at as string,
    votes: voteMap.get(r.id as string) ?? 0,
    versionMismatch:
      typeof currentVersion === 'number' ? currentVersion !== (r.item_version as number) : false,
  }));

  out.sort((a, b) => b.votes - a.votes || b.createdAt.localeCompare(a.createdAt));
  return out;
}

export async function vote(
  explanationId: string,
  voterUserId: string
): Promise<'ok' | 'duplicate'> {
  const db = admin();
  const { error } = await db.from('explanation_votes').insert({
    explanation_id: explanationId,
    voter_user_id: voterUserId,
    value: 1,
  });
  if (error) return 'duplicate';
  return 'ok';
}

export async function flag(explanationId: string, userId: string, reason: string): Promise<void> {
  const db = admin();
  const note = reason.trim().slice(0, 500) || 'user_flag';
  const { data: row } = await db
    .from('community_explanations')
    .select('id, item_id, flag_count, status')
    .eq('id', explanationId)
    .maybeSingle();
  if (!row) return;

  await db
    .from('community_explanations')
    .update({
      flag_count: (row.flag_count as number) + 1,
      moderation_note: `flag:${userId.slice(0, 8)}:${note}`.slice(0, 500),
      updated_at: new Date().toISOString(),
      // Stay visible when approved (config); return to pending review only if hide mode
      ...(COMMUNITY_CONFIG.flagStayVisible
        ? {}
        : row.status === 'approved'
          ? { status: 'pending' }
          : {}),
    })
    .eq('id', explanationId);

  flaggedCounter.add(1);
}

export async function approvedCountFor(userId: string): Promise<number> {
  const db = admin();
  const { count } = await db
    .from('community_explanations')
    .select('id', { count: 'exact', head: true })
    .eq('author_user_id', userId)
    .eq('status', 'approved');
  return count ?? 0;
}

export async function refreshQueueDepth(): Promise<number> {
  const db = admin();
  const { count } = await db
    .from('community_explanations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');
  queueDepthCached = count ?? 0;
  return queueDepthCached;
}

export async function moderateApprove(id: string, note?: string): Promise<void> {
  const db = admin();
  await db
    .from('community_explanations')
    .update({
      status: 'approved',
      moderation_note: note?.slice(0, 500) ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  approvedCounter.add(1);
  await refreshQueueDepth();
}

export async function moderateReject(
  id: string,
  note: string,
  opts?: { contamination?: boolean }
): Promise<void> {
  const db = admin();
  const { data: row } = await db
    .from('community_explanations')
    .select('item_id')
    .eq('id', id)
    .single();
  await db
    .from('community_explanations')
    .update({
      status: 'rejected',
      moderation_note: note.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  rejectedCounter.add(1);

  if (opts?.contamination && row) {
    await db.from('community_item_flags').insert({
      item_id: row.item_id,
      explanation_id: id,
      reason: note.slice(0, 500),
      aup_cite: 'acceptable-use: content integrity / dumps',
      status: 'open',
    });
  }
  await refreshQueueDepth();
}
