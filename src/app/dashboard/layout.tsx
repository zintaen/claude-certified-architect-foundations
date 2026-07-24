import type { Metadata } from 'next';
import { runtimeNoIndex } from '@/lib/runtimeNoIndex';

export const metadata: Metadata = runtimeNoIndex;

export default function RuntimeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
