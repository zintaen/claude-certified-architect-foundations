/**
 * Review cards server helpers (LEARN-003).
 */
import 'server-only';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isCanary } from '@/data/canary.server';
import { newCard, schedule, type Card, type Grade, localDayBounds, SRS_CONFIG } from '@/lib/srs';

function admin() {
  if (!supabaseAdmin) throw new Error('supabaseAdmin required');
  return supabaseAdmin;
}

export async function upsertMissCard(input: {
  userId: string;
  itemId: string;
  examCode?: string;
}): Promise<void> {
  if (isCanary(input.itemId)) return;
  const db = admin();
  const card = newCard();
  await db.from('review_cards').upsert(
    {
      user_id: input.userId,
      card_kind: 'item',
      card_ref: input.itemId,
      exam_code: input.examCode || 'ccaf',
      stability: card.stability,
      difficulty: card.difficulty,
      state: card.state,
      due_at: card.due,
      last_review_at: null,
      suspended: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,card_kind,card_ref' }
  );
}

export async function enrollFlashcard(input: {
  userId: string;
  flashcardKey: string;
  examCode?: string;
}): Promise<void> {
  const db = admin();
  const card = newCard();
  await db.from('review_cards').upsert(
    {
      user_id: input.userId,
      card_kind: 'flashcard',
      card_ref: input.flashcardKey,
      exam_code: input.examCode || 'ccaf',
      stability: card.stability,
      difficulty: card.difficulty,
      state: card.state,
      due_at: card.due,
      suspended: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,card_kind,card_ref' }
  );
}

export type CardView = {
  id: string;
  cardKind: 'item' | 'flashcard';
  cardRef: string;
  examCode: string;
  dueAt: string;
  state: string;
};

export async function dueCards(
  userId: string,
  opts: { examCode?: string; tzOffsetMinutes: number; now?: Date }
): Promise<{ due: CardView[]; dueCount: number; capped: boolean }> {
  const db = admin();
  const now = opts.now ?? new Date();
  const { end } = localDayBounds(now, opts.tzOffsetMinutes);

  let q = db
    .from('review_cards')
    .select('id, card_kind, card_ref, exam_code, due_at, state')
    .eq('user_id', userId)
    .eq('suspended', false)
    .lte('due_at', end.toISOString())
    .order('due_at', { ascending: true })
    .limit(SRS_CONFIG.dailyCap + 50);
  if (opts.examCode) q = q.eq('exam_code', opts.examCode);

  const { data } = await q;
  const all = (data ?? []).map((r) => ({
    id: r.id as string,
    cardKind: r.card_kind as 'item' | 'flashcard',
    cardRef: r.card_ref as string,
    examCode: r.exam_code as string,
    dueAt: r.due_at as string,
    state: r.state as string,
  }));
  const capped = all.length > SRS_CONFIG.dailyCap;
  return {
    due: all.slice(0, SRS_CONFIG.dailyCap),
    dueCount: all.length,
    capped,
  };
}

export async function gradeCard(input: {
  userId: string;
  cardId: string;
  grade: Grade;
  now?: Date;
}): Promise<CardView | null> {
  const db = admin();
  const { data: row } = await db
    .from('review_cards')
    .select('*')
    .eq('id', input.cardId)
    .eq('user_id', input.userId)
    .maybeSingle();
  if (!row) return null;

  const before: Card = {
    stability: Number(row.stability),
    difficulty: Number(row.difficulty),
    state: row.state as Card['state'],
    due: row.due_at as string,
    lastReview: (row.last_review_at as string) || null,
  };
  const next = schedule(before, input.grade, input.now ?? new Date());
  await db
    .from('review_cards')
    .update({
      stability: next.stability,
      difficulty: next.difficulty,
      state: next.state,
      due_at: next.due,
      last_review_at: next.lastReview,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.cardId);

  return {
    id: input.cardId,
    cardKind: row.card_kind as 'item' | 'flashcard',
    cardRef: row.card_ref as string,
    examCode: row.exam_code as string,
    dueAt: next.due,
    state: next.state,
  };
}

export async function setSuspended(
  userId: string,
  cardId: string,
  suspended: boolean
): Promise<void> {
  const db = admin();
  await db
    .from('review_cards')
    .update({ suspended, updated_at: new Date().toISOString() })
    .eq('id', cardId)
    .eq('user_id', userId);
}
