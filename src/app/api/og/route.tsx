import { MARK_CCAF_NAME, INDEPENDENCE_DISCLAIMER_SHORT } from '@/lib/legal';
import { ImageResponse } from 'next/og';

export const alt = `${MARK_CCAF_NAME} mock exam score`;
export const contentType = 'image/png';

// Dynamic, score-specific social card. Driven by query params so a shared result shows the
// person's actual score and pushes their network back to the mock. next/og does not read CSS
// or Tailwind, so every value is an inline style with literal hex (the only place that is fine).
function clampInt(v: string | null, min: number, max: number, dflt: number) {
  const n = parseInt(v || '', 10);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : dflt;
}

function clean(v: string | null, max: number) {
  return (v || '').replace(/[^\w \-]/g, '').slice(0, max);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const score = clampInt(searchParams.get('score'), 0, 1000, 0);
  const passed = searchParams.get('passed') === '1';
  const archetype = clean(searchParams.get('archetype'), 40);
  const nickname = clean(searchParams.get('nickname'), 32);

  const who = nickname ? `${nickname} scored` : 'I scored';
  const verdict =
    (passed ? 'Passed the mock threshold' : 'On the way - keep practicing') +
    (archetype ? '  -  ' + archetype : '');

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#1a1108',
        padding: '72px',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          color: '#f4ba17',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        CyberSkill
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', color: '#c9b7a3', fontSize: 34, fontWeight: 600 }}>
          {who}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            color: '#f5ead9',
            fontSize: 132,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {String(score)}
          <span
            style={{
              display: 'flex',
              color: '#c9b7a3',
              fontSize: 48,
              fontWeight: 600,
              marginLeft: 16,
              marginBottom: 16,
            }}
          >
            / 1000
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            color: passed ? '#7bbf6a' : '#f4ba17',
            fontSize: 32,
            fontWeight: 600,
            marginTop: 12,
          }}
        >
          {verdict}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: '#f5ead9' }}>
        <div style={{ fontSize: 36, fontWeight: 700 }}>CyberSkill</div>
        <div style={{ fontSize: 28, fontWeight: 600 }}>{`${MARK_CCAF_NAME} mock`}</div>
        <div style={{ fontSize: 22, fontWeight: 500 }}>{INDEPENDENCE_DISCLAIMER_SHORT}</div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
