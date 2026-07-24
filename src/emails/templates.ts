/**
 * In-repo email templates (GROWTH-005). Plain text + simple HTML.
 * No tracking pixels. Independence disclaimer + contact footer required.
 */
import { INDEPENDENCE_DISCLAIMER } from '@/lib/legal';
import { DEFAULT_SITE_ORIGIN } from '@/lib/site';

export type TemplateKey =
  | 'welcome'
  | 'first_mock_nudge'
  | 'exam_week'
  | 'post_pass_multi_cert'
  | 'win_back';

export type BuiltEmail = { subject: string; text: string; html: string };

function footer(unsubscribeUrl: string): { text: string; html: string } {
  const text = [
    '',
    '—',
    INDEPENDENCE_DISCLAIMER,
    'CyberSkill · info@cyberskill.world',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');
  const html = `<hr/><p style="font-size:12px;color:#666">${INDEPENDENCE_DISCLAIMER}</p>
<p style="font-size:12px;color:#666">CyberSkill · <a href="mailto:info@cyberskill.world">info@cyberskill.world</a></p>
<p style="font-size:12px"><a href="${unsubscribeUrl}">Unsubscribe</a></p>`;
  return { text, html };
}

function wrap(subject: string, bodyText: string, bodyHtml: string, unsub: string): BuiltEmail {
  const f = footer(unsub);
  return {
    subject,
    text: `${bodyText}\n${f.text}`,
    html: `<div style="font-family:system-ui,sans-serif;line-height:1.5">${bodyHtml}${f.html}</div>`,
  };
}

export function buildEmail(template: TemplateKey, data: Record<string, unknown>): BuiltEmail {
  const unsub = String(data.unsubscribeUrl || '#');
  const origin = String(data.siteOrigin || DEFAULT_SITE_ORIGIN);
  const utm = (seq: string) => `utm_source=email&utm_medium=lifecycle&utm_campaign=${seq}`;

  switch (template) {
    case 'welcome':
      return wrap(
        'Welcome to CyberSkill practice updates',
        `Thanks for subscribing. You will get occasional study tips, mock nudges, and multi-cert journey notes — never sold, no fake urgency.\nStart practicing: ${origin}/?${utm('welcome')}`,
        `<p>Thanks for subscribing. You will get occasional study tips, mock nudges, and multi-cert journey notes — never sold, no fake urgency.</p><p><a href="${origin}/?${utm('welcome')}">Start practicing</a></p>`,
        unsub
      );
    case 'first_mock_nudge':
      return wrap(
        'Ready for a first practice mock?',
        `Whenever you have a quiet hour, a free practice mock is a calm way to see where you stand.\n${origin}/?${utm('first_mock_nudge')}`,
        `<p>Whenever you have a quiet hour, a free practice mock is a calm way to see where you stand.</p><p><a href="${origin}/?${utm('first_mock_nudge')}">Open practice</a></p>`,
        unsub
      );
    case 'exam_week':
      return wrap(
        'Your study plan notes an upcoming exam date',
        `Your plan lists an exam date soon. A short review pass may help — no pressure, just a reminder you asked for.\n${origin}/dashboard?${utm('exam_week')}`,
        `<p>Your plan lists an exam date soon. A short review pass may help — no pressure, just a reminder you asked for.</p><p><a href="${origin}/dashboard?${utm('exam_week')}">Open dashboard</a></p>`,
        unsub
      );
    case 'post_pass_multi_cert': {
      const recs = Array.isArray(data.recommendations) ? (data.recommendations as string[]) : [];
      const list = recs.length ? recs.join(', ') : 'other exams in the same track';
      return wrap(
        'Skills that transfer to related certs',
        `Nice progress on your practice pass. Related exams in the same vendor track you might explore next: ${list}.\n${origin}/exams?${utm('post_pass_multi_cert')}`,
        `<p>Nice progress on your practice pass. Related exams in the same vendor track you might explore next: <strong>${list}</strong>.</p><p><a href="${origin}/exams?${utm('post_pass_multi_cert')}">Browse catalog</a></p>`,
        unsub
      );
    }
    case 'win_back':
      return wrap(
        'Still here when you are ready',
        `It has been a while since your last practice. Your progress stays available whenever you return — no countdown, no pressure.\n${origin}/?${utm('win_back')}`,
        `<p>It has been a while since your last practice. Your progress stays available whenever you return — no countdown, no pressure.</p><p><a href="${origin}/?${utm('win_back')}">Continue practicing</a></p>`,
        unsub
      );
    default: {
      const _exhaustive: never = template;
      return _exhaustive;
    }
  }
}
