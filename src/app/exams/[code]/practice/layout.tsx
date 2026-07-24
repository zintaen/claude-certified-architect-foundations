import type { Metadata } from 'next';
import { runtimeNoIndex } from '@/lib/runtimeNoIndex';

export const metadata: Metadata = runtimeNoIndex;

export default function PracticeModeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
