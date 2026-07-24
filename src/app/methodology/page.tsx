import { INDEPENDENCE_DISCLAIMER } from '@/lib/legal';
import { PolicyNav } from '@/components/PolicyChrome';

export const metadata = {
  title: 'Readiness methodology | CyberSkill',
  description:
    'How CyberSkill computes practice readiness bands — guidance from practice data, not pass predictions.',
};

export default function MethodologyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
      <PolicyNav />
      <h1 className="text-3xl font-bold">How the readiness score works</h1>
      <p className="text-foreground/80 leading-relaxed">
        The readiness score summarizes your practice performance on this site so you can see where
        to focus. It is guidance — not a prediction or guarantee about any live certification exam.
      </p>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">What goes in</h2>
        <p className="text-foreground/80 leading-relaxed">
          Graded practice answers in a recent window, grouped by domain, with newer answers counting
          more than older ones, and domains with thin coverage discounted.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">What stays out</h2>
        <p className="text-foreground/80 leading-relaxed">
          Canary items, beta items, and custom sittings. We do not publish per-item statistics on
          this page.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Bands</h2>
        <p className="text-foreground/80 leading-relaxed">
          Scores map to building / approaching / ready as study guidance. Full formulas live in the
          operator methodology doc in the repository; this page is the public trust summary.
        </p>
      </section>
      <p className="text-sm text-foreground/60">{INDEPENDENCE_DISCLAIMER}</p>
    </main>
  );
}
