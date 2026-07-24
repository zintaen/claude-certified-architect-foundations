/**
 * Apply provider-neutral FulfillmentAction through PAY-001 write paths.
 */
import 'server-only';
import { expireEntitlement, grantEntitlement, revokeEntitlementsForSku } from '@/lib/entitlements';
import { examByCode } from '@/lib/catalog';
import type { FulfillmentAction } from '@/lib/paddle';
import { settledTier, loadTierConfig } from '@/lib/geoTier';

export type ApplyResult =
  | { status: 'granted' | 'extended' | 'revoked' | 'expired'; duplicate?: boolean }
  | { status: 'skipped'; reason: string };

export async function applyFulfillmentAction(action: FulfillmentAction): Promise<ApplyResult> {
  const metaBase = {
    paddle_event_id: action.paddleEventId,
  };

  switch (action.kind) {
    case 'grant': {
      let examId: string | null = null;
      if (action.examCode) {
        const exam = await examByCode(action.examCode);
        examId = exam?.id ?? null;
      }
      const cfg = loadTierConfig();
      const settled = action.paymentCountry
        ? settledTier(action.tier, action.paymentCountry, cfg)
        : action.tier;
      const result = await grantEntitlement({
        userId: action.userId,
        sku: action.sku,
        examId,
        source: 'paddle',
        actor: 'webhook',
        endsAt: action.endsAt,
        metadata: {
          ...metaBase,
          transaction_id: action.transactionId,
          subscription_id: action.subscriptionId,
          tier: settled,
          provisional_tier: action.tier,
          payment_country: action.paymentCountry,
          eu_consent: action.euConsent,
        },
      });
      return { status: 'granted', duplicate: result.duplicate };
    }
    case 'extend': {
      let examId: string | null = null;
      if (action.examCode) {
        const exam = await examByCode(action.examCode);
        examId = exam?.id ?? null;
      }
      const result = await grantEntitlement({
        userId: action.userId,
        sku: action.sku,
        examId,
        source: 'paddle',
        actor: 'webhook',
        endsAt: action.endsAt,
        metadata: {
          ...metaBase,
          transaction_id: action.transactionId,
          subscription_id: action.subscriptionId,
          lifecycle: 'renewal',
        },
      });
      return { status: 'extended', duplicate: result.duplicate };
    }
    case 'revoke': {
      await revokeEntitlementsForSku({
        userId: action.userId,
        sku: action.sku,
        actor: 'webhook',
        source: 'paddle',
        metadata: {
          ...metaBase,
          subscription_id: action.subscriptionId,
          reason: action.reason,
        },
      });
      return { status: 'revoked' };
    }
    case 'expire': {
      await expireEntitlement({
        userId: action.userId,
        sku: action.sku,
        actor: 'webhook',
        source: 'paddle',
        metadata: {
          ...metaBase,
          subscription_id: action.subscriptionId,
        },
      });
      return { status: 'expired' };
    }
    default: {
      const _exhaustive: never = action;
      return { status: 'skipped', reason: `unknown_kind:${JSON.stringify(_exhaustive)}` };
    }
  }
}
