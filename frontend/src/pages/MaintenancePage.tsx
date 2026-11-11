import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';

const T = {
  bg: '#121214',
  text: '#ffffff',
  muted: '#7a8499',
  border: 'rgba(255,255,255,0.10)',
  accent: '#3b82f6',
  font: "'Plus Jakarta Sans', sans-serif",
} as const;

type Props = {
  siteName?: string;
  supportEmail?: string;
};

const MaintenancePage: FC<Props> = ({
  siteName = 'Ensemble',
  supportEmail = 'support@ensemble.app',
}) => {
  const navigate = useNavigate();

  return (
    <main
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.text,
        fontFamily: T.font,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-20% auto auto 50%',
          width: 520,
          height: 520,
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 68%)',
          pointerEvents: 'none',
        }}
      />

      <section
        style={{
          width: '100%',
          maxWidth: 560,
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 28,
          }}
        >
          <img
            src="/ensemble_lg.svg"
            alt={`${siteName} logo`}
            style={{ width: 36, height: 36, display: 'block' }}
          />
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 0.3 }}>{siteName}</span>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 999,
            border: `1px solid ${T.border}`,
            background: 'rgba(255,255,255,0.03)',
            color: T.muted,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 22,
          }}
        >
          <Wrench size={14} />
          Scheduled maintenance
        </div>

        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 40px)',
            lineHeight: 1.15,
            fontWeight: 700,
            margin: '0 0 14px',
          }}
        >
          We&apos;ll be right back
        </h1>
        <p
          style={{
            margin: '0 auto 28px',
            maxWidth: 440,
            color: T.muted,
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          {siteName} is temporarily unavailable while we improve the platform.
          The marketing site stays open. Member login and the app will return shortly.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '12px 20px',
              background: '#fff',
              color: '#080a12',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: T.font,
            }}
          >
            Back to landing
          </button>
          <a
            href={`mailto:${supportEmail}`}
            style={{
              border: `1px solid ${T.border}`,
              borderRadius: 999,
              padding: '12px 20px',
              color: T.text,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14,
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            Contact support
          </a>
        </div>

        <p style={{ marginTop: 28, color: T.muted, fontSize: 12 }}>
          Staff and admins can still use their consoles.
        </p>
      </section>
    </main>
  );
};

export default MaintenancePage;
