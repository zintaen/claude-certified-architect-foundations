import { PRIVACY_META } from '@/lib/consent';
import { PolicyHeader, PolicyNav } from '@/components/PolicyChrome';

export const metadata = {
  title: 'Privacy Policy | CyberSkill',
  description: 'How CyberSkill collects and uses data for practice exams.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <PolicyNav />
      <PolicyHeader title="Privacy Policy" meta={PRIVACY_META} />

      <section className="space-y-3 mb-10" data-testid="privacy-data">
        <h2 className="text-xl font-semibold">Data we collect</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 font-semibold">Category</th>
                <th className="py-2 pr-4 font-semibold">Purpose</th>
                <th className="py-2 font-semibold">Storage</th>
              </tr>
            </thead>
            <tbody className="text-foreground/90">
              <tr className="border-b border-border">
                <td className="py-2 pr-4">Email (optional)</td>
                <td className="py-2 pr-4">Save and retrieve progress; newsletter if opted in</td>
                <td className="py-2">Supabase</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4">PIN hash (optional)</td>
                <td className="py-2 pr-4">Authenticate progress retrieval</td>
                <td className="py-2">Supabase</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4">Exam sittings and scores</td>
                <td className="py-2 pr-4">Grade practice, show history</td>
                <td className="py-2">Supabase / local device</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4">Leaderboard entries</td>
                <td className="py-2 pr-4">Public rankings of timed mocks</td>
                <td className="py-2">Supabase</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4">Newsletter opt-in</td>
                <td className="py-2 pr-4">Product updates you requested</td>
                <td className="py-2">Supabase / email provider</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4">Operational telemetry</td>
                <td className="py-2 pr-4">Reliability and abuse prevention</td>
                <td className="py-2">Hosting / logs</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Analytics (optional)</td>
                <td className="py-2 pr-4">Aggregate product usage — only if you accept</td>
                <td className="py-2">Analytics provider</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 mb-10" data-testid="privacy-processors">
        <h2 className="text-xl font-semibold">Sub-processors</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 font-semibold">Processor</th>
                <th className="py-2 pr-4 font-semibold">Role</th>
                <th className="py-2 font-semibold">Region notes</th>
              </tr>
            </thead>
            <tbody className="text-foreground/90">
              <tr className="border-b border-border">
                <td className="py-2 pr-4">Supabase</td>
                <td className="py-2 pr-4">Database and auth storage</td>
                <td className="py-2">US/EU (project config)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4">Vercel</td>
                <td className="py-2 pr-4">Hosting and edge network</td>
                <td className="py-2">US / global edge</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4">PostHog</td>
                <td className="py-2 pr-4">
                  Product analytics (only if you accept analytics cookies)
                </td>
                <td className="py-2">US cloud (configurable)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4">AI tutor provider</td>
                <td className="py-2 pr-4">
                  Processes optional tutor follow-up question text when live help is used (premium).
                  Item stems and pre-generated explanations may be included in the model context. No
                  email or account identifiers are sent to the model.
                </td>
                <td className="py-2">Configured per deploy (TUTOR_API_URL)</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 pr-4">Transactional email provider</td>
                <td className="py-2 pr-4">
                  Delivers lifecycle messages you opted into (welcome, study nudges, multi-cert
                  journey notes). Address + template metadata only; no open/click tracking pixels.
                </td>
                <td className="py-2">Configured per deploy (EMAIL_PROVIDER)</td>
              </tr>
              <tr data-testid="privacy-paddle-row">
                <td className="py-2 pr-4">Paddle</td>
                <td className="py-2 pr-4">
                  Merchant of Record for paid products: checkout, invoicing, tax remittance,
                  refunds/cancellations. Receives billing identity and payment details you provide
                  at checkout; CyberSkill never stores card numbers.
                </td>
                <td className="py-2">Global (Paddle MoR)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 mb-10">
        <h2 className="text-xl font-semibold">Retention</h2>
        <p className="leading-relaxed text-foreground/90">
          Progress and leaderboard data are retained while your account remains active or until you
          request deletion. Logs are retained for operational periods then deleted or aggregated.
          Consent choices persist for up to 12 months.
        </p>
      </section>

      <section className="space-y-3 mb-10" data-testid="privacy-frameworks">
        <h2 className="text-xl font-semibold">Legal frameworks</h2>
        <p className="leading-relaxed text-foreground/90">
          Depending on where you are, the following may apply: Vietnam Personal Data Protection Law
          and Decree 356/2025; GDPR for EU visitors; CCPA/CPRA for California visitors. Listing
          these frameworks does not imply that every corporate filing (for example cross-border
          transfer assessments) is complete — entity-level obligations sit on the corporate track.
        </p>
      </section>

      <section className="space-y-3 mb-10" data-testid="privacy-rights">
        <h2 className="text-xl font-semibold">Your rights</h2>
        <p className="leading-relaxed text-foreground/90">
          To access, correct, or delete personal data we hold about you, contact{' '}
          <a href="mailto:info@cyberskill.world" className="text-primary underline">
            info@cyberskill.world
          </a>
          . You can reject analytics via the cookie banner or by enabling Global Privacy Control in
          your browser.
        </p>
      </section>
    </main>
  );
}
