'use client';

import { useEffect } from 'react';
import { startAnalyticsRuntime } from '@/lib/analytics';

/**
 * Hydration-safe PostHog runtime (OBS-001).
 * Subscribes to consent; loads posthog-js only after analytics is granted.
 * Renders nothing — does not block first paint.
 */
export default function AnalyticsProvider({ children }: { children?: React.ReactNode }) {
  useEffect(() => startAnalyticsRuntime(), []);
  return children ? <>{children}</> : null;
}
