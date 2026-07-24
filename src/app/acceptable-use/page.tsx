import { AUP_META } from '@/lib/consent';
import { PolicyHeader, PolicyNav } from '@/components/PolicyChrome';

export const metadata = {
  title: 'Acceptable Use Policy | CyberSkill',
  description:
    'Acceptable use rules for CyberSkill practice exams: no dumps, no scraping, content integrity.',
};

export default function AcceptableUsePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <PolicyNav />
      <PolicyHeader title="Acceptable Use Policy" meta={AUP_META} />

      <section className="space-y-3 mb-10" data-testid="aup-stance">
        <h2 className="text-xl font-semibold">Content integrity</h2>
        <p className="leading-relaxed text-foreground/90">
          CyberSkill publishes original practice content derived from public exam blueprints — not
          dumps of live exams. That stance is the trust axis of this product. Contributing or
          requesting live-exam content is prohibited.
        </p>
      </section>

      <section className="space-y-3 mb-10" data-testid="aup-prohibitions">
        <h2 className="text-xl font-semibold">Prohibited conduct</h2>
        <ul className="list-disc pl-6 space-y-3 leading-relaxed text-foreground/90">
          <li>
            Contributing recalled live-exam content (&quot;brain dumps&quot;) or any NDA-protected
            exam material.
          </li>
          <li>
            Scraping, crawling, or bulk-exporting the question bank (automated harvest of stems,
            options, or explanations).
          </li>
          <li>
            Automated account creation or credential sharing intended to defeat access limits or
            abuse free tiers.
          </li>
          <li>
            Reselling or republishing item content without written permission from CyberSkill.
          </li>
        </ul>
        <p className="leading-relaxed text-foreground/90">
          Violations may result in removal of contributions and loss of access to the service.
        </p>
      </section>

      <section className="space-y-3 mb-10" data-testid="aup-report">
        <h2 className="text-xl font-semibold">Report a problematic item</h2>
        <p className="leading-relaxed text-foreground/90">
          If you believe an item resembles live exam content, use the in-product question flag / bug
          reporter on the site, or flag a community explanation on the result page. Community
          explanations are learner-written and human-moderated; recalled live-exam material in that
          channel is rejected under this policy and may place the related item into review. We
          commit to investigate reports and to pull items pending review when appropriate.
        </p>
      </section>

      <section className="space-y-3 mb-10">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="leading-relaxed text-foreground/90">
          <a href="mailto:info@cyberskill.world" className="text-primary underline">
            info@cyberskill.world
          </a>
        </p>
      </section>
    </main>
  );
}
