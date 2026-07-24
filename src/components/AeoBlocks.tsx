import type { FactBoxModel, AnswerBlockModel } from '@/lib/aeo';

export function ExamFactBox({ fact }: { fact: FactBoxModel }) {
  return (
    <aside
      className="rounded-lg border border-foreground/15 bg-foreground/[0.03] p-4 text-sm space-y-2"
      data-testid="aeo-fact-box"
    >
      <h2 className="font-semibold">Exam facts</h2>
      <p data-aeo-answer>
        <strong>{fact.examName}</strong> ({fact.examCode.toUpperCase()})
        {fact.priceUsd == null
          ? ' has no list price in our config (verify with the vendor)'
          : ` is listed at $${fact.priceUsd}`}
        , delivered via {fact.delivery}, with about {fact.itemCount} items in ~
        {fact.durationMinutes} minutes
        {fact.validityMonths == null ? '' : ` and ${fact.validityMonths}-month validity`} in our
        config (retrieved {fact.retrieved}).
      </p>
      <p className="text-foreground/70">{fact.verifyLine}</p>
      <p className="text-foreground/70">{fact.independenceLine}</p>
      <p className="text-xs text-muted">
        Source:{' '}
        <a href={fact.sourceUrl} className="text-primary underline" rel="noreferrer">
          {fact.sourceUrl}
        </a>
      </p>
    </aside>
  );
}

export function AnswerBlock({ block }: { block: AnswerBlockModel }) {
  return (
    <section className="space-y-2" data-testid="aeo-answer-block">
      <h2 className="text-lg font-semibold" id={slug(block.question)}>
        {block.question}
      </h2>
      <p className="text-foreground/90" data-aeo-answer>
        {block.answer}
      </p>
    </section>
  );
}

function slug(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}
