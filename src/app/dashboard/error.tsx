'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-6 text-center gap-4">
      <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-foreground/60 max-w-md">
        We encountered an unexpected error while loading this page.
      </p>
      <button
        onClick={() => reset()}
        className="mt-4 px-6 py-2 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
