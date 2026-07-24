/**
 * Verdict-gated beta insert. No approved review → refuse.
 * Uses service-role Supabase client when provided.
 */

import { refuseUnsigned } from './sme-queue.mjs';

export async function insertBetaItems({ db, examCode, items, reviews, domainKeyByName }) {
  const { allowed, refused } = refuseUnsigned(items, reviews);
  if (!allowed.length) {
    return { inserted: [], refused };
  }

  const { data: exam, error: eErr } = await db
    .from('exams')
    .select('id')
    .eq('code', examCode)
    .single();
  if (eErr) throw eErr;

  const inserted = [];
  for (const item of allowed) {
    const domainId = domainKeyByName?.[item.domain];
    if (!domainId) {
      refused.push({
        draft_id: item.draft_id,
        item_ref: item.item_ref,
        reason: 'domain_unresolved',
      });
      continue;
    }
    const row = {
      exam_id: exam.id,
      domain_id: domainId,
      external_key: item.draft_id || item.item_ref,
      stem: item.stem,
      options: item.options,
      correct_key: item.correct_key,
      explanations: item.explanations ?? null,
      item_status: 'beta',
      provenance: item.provenance,
      version: 1,
    };
    const { data, error } = await db
      .from('items')
      .upsert(row, { onConflict: 'exam_id,external_key' })
      .select('id, external_key, item_status')
      .single();
    if (error) throw error;

    // Persist the approving review against the draft item_ref (not FK-bound).
    const review = reviews
      .filter((r) => r.item_ref === item.item_ref && r.verdict === 'approved')
      .sort((a, b) => String(b.signed_at).localeCompare(String(a.signed_at)))[0];
    if (review) {
      await db.from('item_reviews').insert({
        item_ref: item.item_ref,
        reviewer: review.reviewer,
        verdict: review.verdict,
        notes: review.notes ?? null,
        signed_at: review.signed_at,
      });
    }
    inserted.push(data);
  }
  return { inserted, refused };
}
