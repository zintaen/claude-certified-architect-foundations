import { TERMS_META } from '@/lib/consent';
import { PolicyHeader, PolicyNav } from '@/components/PolicyChrome';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | CyberSkill',
  description: 'Terms of service and honor code for CyberSkill practice exams.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 prose-legal">
      <PolicyNav />
      <PolicyHeader title="Terms of Service" meta={TERMS_META} />

      <section className="space-y-4 text-foreground/90 leading-relaxed mb-10">
        <p>
          These Terms govern your use of CyberSkill practice-exam sites operated by CyberSkill
          Software Solutions Consultancy and Development JSC (&quot;CyberSkill&quot;,
          &quot;we&quot;). By using the service you agree to these Terms and our{' '}
          <Link href="/acceptable-use" className="text-primary underline">
            Acceptable Use Policy
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3 mb-10" data-testid="honor-code">
        <h2 className="text-xl font-semibold">Honor code</h2>
        <p className="leading-relaxed text-foreground/90">By using this service you agree that:</p>
        <ol className="list-decimal pl-6 space-y-3 leading-relaxed text-foreground/90">
          <li>
            You will not submit, upload, or share content from real, NDA-protected certification
            exams (including recalled live questions or &quot;brain dump&quot; material).
          </li>
          <li>
            You will not use the service to violate any exam vendor&apos;s candidate agreement or
            similar rules that apply to you.
          </li>
          <li>
            CyberSkill items are original works derived from public exam blueprints and are provided
            for preparation, not as reproductions of live exams.
          </li>
        </ol>
      </section>

      <section className="space-y-3 mb-10">
        <h2 className="text-xl font-semibold">Independent practice resource</h2>
        <p className="leading-relaxed text-foreground/90">
          CyberSkill is an independent practice-exam resource and is neither affiliated with, nor
          authorized, sponsored, or approved by, Anthropic, PBC, or any other exam vendor whose
          credentials we help you prepare for.
        </p>
      </section>

      <section className="space-y-3 mb-10">
        <h2 className="text-xl font-semibold">Accounts and progress</h2>
        <p className="leading-relaxed text-foreground/90">
          Optional email and PIN credentials are used only to save and retrieve your own progress.
          You are responsible for keeping your PIN confidential. We may suspend access for
          Acceptable Use Policy violations.
        </p>
      </section>

      <section className="space-y-3 mb-10">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="leading-relaxed text-foreground/90">
          Questions about these Terms:{' '}
          <a href="mailto:info@cyberskill.world" className="text-primary underline">
            info@cyberskill.world
          </a>
          .
        </p>
      </section>
    </main>
  );
}
