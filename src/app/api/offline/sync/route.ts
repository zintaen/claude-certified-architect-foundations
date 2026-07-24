import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Offline answer queue sync (SCALE-002).
 * Idempotent via client_id — duplicate posts are accepted once.
 * Guests without identity still get clientIds acknowledged (local-only dedupe);
 * identified users persist receipts when service role is available.
 */

type Incoming = {
  clientId: string;
  sittingId: string;
  itemId: string;
  selectedKey: string;
  elapsedMs: number;
  queuedAt: string;
  examCode?: string;
};

const memoryReceipts = new Set<string>();

function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const out = v.trim().slice(0, max);
  return out.length ? out : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = clean(body?.email, 254)?.toLowerCase() ?? null;
    const pinHash = clean(body?.pinHash, 128);
    const raw = Array.isArray(body?.answers) ? body.answers : [];
    const answers: Incoming[] = [];
    for (const row of raw.slice(0, 200)) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      const clientId = clean(r.clientId, 64);
      const sittingId = clean(r.sittingId, 64);
      const itemId = clean(r.itemId, 64);
      const selectedKey = clean(r.selectedKey, 8);
      if (!clientId || !sittingId || !itemId || !selectedKey) continue;
      answers.push({
        clientId,
        sittingId,
        itemId,
        selectedKey,
        elapsedMs: typeof r.elapsedMs === 'number' ? r.elapsedMs : 0,
        queuedAt: clean(r.queuedAt, 40) ?? new Date().toISOString(),
        examCode: clean(r.examCode, 32) ?? undefined,
      });
    }

    const syncedClientIds: string[] = [];

    if (email && pinHash && supabaseAdmin) {
      const db = supabaseAdmin as unknown as SupabaseClient;
      for (const a of answers) {
        const { error } = await db.from('offline_answer_receipts').upsert(
          {
            client_id: a.clientId,
            email,
            pin_hash: pinHash,
            sitting_id: a.sittingId,
            item_id: a.itemId,
            selected_key: a.selectedKey,
            elapsed_ms: a.elapsedMs,
            queued_at: a.queuedAt,
            exam_code: a.examCode ?? null,
          },
          { onConflict: 'client_id', ignoreDuplicates: true }
        );
        // Treat unique conflict / success as synced (idempotent).
        if (!error || /duplicate|unique/i.test(error.message)) {
          syncedClientIds.push(a.clientId);
        }
      }
    } else {
      for (const a of answers) {
        if (!memoryReceipts.has(a.clientId)) memoryReceipts.add(a.clientId);
        syncedClientIds.push(a.clientId);
      }
    }

    return NextResponse.json({ ok: true, syncedClientIds });
  } catch {
    return NextResponse.json({ ok: false, syncedClientIds: [] }, { status: 500 });
  }
}

/** Test helper */
export function __resetMemoryReceiptsForTests(): void {
  memoryReceipts.clear();
}
