import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Claude Certified Architect - Mock Exam by CyberSkill';

// Branded social card. next/og does not read CSS or Tailwind, so every value
// here is an inline style with literal hex (the only place literal hex is allowed).
export default async function OpengraphImage() {
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
        <div
          style={{
            display: 'flex',
            color: '#f5ead9',
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          Claude Certified Architect
        </div>
        <div
          style={{
            display: 'flex',
            color: '#f4ba17',
            fontSize: 38,
            fontWeight: 600,
            marginTop: 18,
          }}
        >
          Free practice mock - by CyberSkill
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          color: '#c9b7a3',
          fontSize: 30,
          fontWeight: 500,
        }}
      >
        60 questions - 120 minutes
      </div>
    </div>,
    { ...size }
  );
}
