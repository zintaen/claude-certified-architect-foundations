/** SME review queue: record named human verdicts before insert. */

import { randomUUID } from 'node:crypto';

/**
 * Ensure every draft has a stable UUID item_ref for review rows + later insert.
 */
export function assignItemRefs(items) {
  return items.map((item) => ({
    ...item,
    item_ref: item.item_ref || randomUUID(),
  }));
}

export function latestVerdict(reviews, itemRef) {
  const rows = reviews
    .filter((r) => r.item_ref === itemRef)
    .sort((a, b) => String(b.signed_at).localeCompare(String(a.signed_at)));
  return rows[0] || null;
}

export function recordReview({ item_ref, reviewer, verdict, notes = '' }) {
  if (!item_ref) throw new Error('item_ref required');
  if (!reviewer || !String(reviewer).trim()) throw new Error('named reviewer required');
  if (!['approved', 'rejected', 'revise'].includes(verdict)) {
    throw new Error(`invalid verdict: ${verdict}`);
  }
  return {
    item_ref,
    reviewer: String(reviewer).trim(),
    verdict,
    notes,
    signed_at: new Date().toISOString(),
  };
}

/** Items eligible for beta insert: latest review is approved. */
export function approvedForInsert(items, reviews) {
  return items.filter((item) => {
    const latest = latestVerdict(reviews, item.item_ref);
    return latest?.verdict === 'approved';
  });
}

export function refuseUnsigned(items, reviews) {
  const refused = [];
  const allowed = [];
  for (const item of items) {
    const latest = latestVerdict(reviews, item.item_ref);
    if (latest?.verdict === 'approved') allowed.push(item);
    else
      refused.push({
        draft_id: item.draft_id,
        item_ref: item.item_ref,
        reason: 'no_approved_review',
      });
  }
  return { allowed, refused };
}
