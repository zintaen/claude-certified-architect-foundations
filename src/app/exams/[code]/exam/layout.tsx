import type { Metadata } from 'next';
import { runtimeNoIndex } from '@/lib/runtimeNoIndex';

export const metadata: Metadata = runtimeNoIndex;

export default function ExamModeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
