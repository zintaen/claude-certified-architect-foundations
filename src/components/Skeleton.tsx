interface SkeletonProps {
  className?: string;
}

/**
 * A single placeholder box. Uses surface-raised so it reads in both light
 * and warm-dark themes, and Tailwind's animate-pulse for the shimmer. The
 * global prefers-reduced-motion rule already neutralizes that CSS animation,
 * so no extra handling is needed here.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={`surface-raised rounded-md animate-pulse ${className}`} />
  );
}

interface SkeletonRowProps {
  className?: string;
}

/**
 * A list-row placeholder: a round avatar/rank chip, two stacked text lines,
 * and a trailing value. Roughly matches the leaderboard and history rows.
 */
export function SkeletonRow({ className = '' }: SkeletonRowProps) {
  return (
    <div
      className={`flex items-center justify-between p-4 border-b border-border last:border-0 ${className}`}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-12" />
    </div>
  );
}
