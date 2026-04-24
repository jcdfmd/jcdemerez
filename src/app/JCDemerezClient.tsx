'use client';

import { useState, useEffect } from 'react';

export default function JCDemerezClient() {
  const [isDark, setIsDark] = useState(false);
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('Ha ocurrido un error. Inténtalo de nuevo.');

  // Dark mode automático: 19:00–07:00 (mismo comportamiento que adagium.es)
  useEffect(() => {
    const checkSchedule = () => {
      const hour = new Date().getHours();
      setIsDark(hour >= 19 || hour < 7);
    };
    checkSchedule();
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (honeypot) {
      setStatus('success');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, honeypot })
      });
      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error) setErrorMessage(data.error);
        setStatus('error');
      }
    } catch (e) {
      setErrorMessage(String(e));
      setStatus('error');
    }
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ─────────────────────────────────────────────
  // Estilos compartidos
  // ─────────────────────────────────────────────
  const sectionTitle: React.CSSProperties = {
    fontSize: 'clamp(1.2rem, 3vmin, 1.8rem)',
    fontWeight: 'normal',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: 'clamp(0.2rem, 0.6vmin, 0.4rem)',
    opacity: 0.5,
    transition: 'opacity 0.3s',
    cursor: 'default',
  };

  const sectionSubtitle: React.CSSProperties = {
    fontSize: 'clamp(0.85rem, 1.7vmin, 1.1rem)',
    opacity: 0.7,
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      minHeight: '100dvh',
    }}>

      {/* ═══════ HEADER: JC de Merez ═══════ */}
      <header style={{
        flex: '0 0 auto',
        paddingTop: '4vmin',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 'clamp(1.7rem, 4.2vmin, 2.6rem)',
          fontWeight: 'bold',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 'clamp(0.3rem, 0.8vmin, 0.5rem)',
        }}>
          JC de Merez
        </h1>
        <div style={{
          fontSize: 'clamp(0.9rem, 1.85vmin, 1.15rem)',
          opacity: 0.8,
        }}>
          nulla die sine aphorismus
        </div>
      </header>

      {/* ═══════ MAIN: Proyectos ═══════ */}
      <main style={{
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(3rem, 8vmin, 6rem) clamp(16px, 4vmin, 40px)',
        gap: 'clamp(4rem, 9vmin, 7rem)',
      }}>

        {/* ── Adagium ── */}
        <section style={{ textAlign: 'center' }}>
          <a
            href="https://adagium.es"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <h2
              style={sectionTitle}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
            >Adagium</h2>
          </a>
          <div style={sectionSubtitle}>ars brevis, vita longa</div>
        </section>

        {/* ── La Balanza de Minerva ── */}
        <section style={{ textAlign: 'center' }}>
          <h2
            style={sectionTitle}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
          >La Balanza de Minerva</h2>
          <div style={sectionSubtitle}>aforismos prácticos y filosóficos</div>
        </section>

        {/* ── Classicus ── */}
        <section style={{ textAlign: 'center' }}>
          <h2
            style={sectionTitle}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
          >Classicus</h2>
          <div style={sectionSubtitle}>biblioteca de obras eternas</div>
        </section>

      </main>

      {/* ═══════ FOOTER: Newsletter + Firma ═══════ */}
      <footer style={{
        flex: '0 0 auto',
        paddingBottom: '4vmin',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4vmin',
      }}>

        {/* Formulario de suscripción */}
        <div style={{ maxWidth: '400px', width: '90%', transition: 'opacity 0.3s' }}>
          {status === 'success' ? (
            <div style={{ opacity: 0.8, fontSize: '0.9rem', padding: '10px' }}>Hecho, suscripción confirmada</div>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                name="b_email"
                tabIndex={-1}
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ position: 'absolute', opacity: 0, top: -9999, left: -9999 }}
                autoComplete="off"
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Tu correo electrónico..."
                required
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: 'transparent',
                  border: isDark ? '1px solid #666' : '1px solid #888',
                  borderRadius: '6px',
                  color: 'inherit',
                  outline: 'none',
                  fontSize: '0.9rem',
                  minWidth: 0,
                  transition: 'border-color 0.3s',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                style={{
                  padding: '10px 18px',
                  background: !isValidEmail ? (isDark ? '#444' : '#888888') : (isDark ? '#ffffff' : '#000000'),
                  color: !isValidEmail ? (isDark ? '#888' : '#ffffff') : (isDark ? '#000000' : '#ffffff'),
                  border: 'none',
                  borderRadius: '6px',
                  cursor: status === 'loading' ? 'wait' : (!isValidEmail ? 'not-allowed' : 'pointer'),
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  transition: 'background-color 0.3s, color 0.3s',
                  fontFamily: 'inherit',
                }}
              >
                {status === 'loading' ? '...' : 'Suscribirme'}
              </button>
            </form>
          )}
          {status === 'error' && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '8px' }}>{errorMessage}</div>}
        </div>

        {/* Iconos sociales + firma */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2vmin' }}>

          {/* Iconos: X.com + Email */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'clamp(20px, 3vmin, 32px)' }}>

            {/* X.com (Twitter) */}
            <a
              href="https://x.com/jcdemerez"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
              style={{
                color: 'inherit',
                opacity: 0.6,
                transition: 'opacity 0.3s',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
            >
              {/* X logo SVG */}
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ width: 'clamp(24px, 3.5vmin, 34px)', height: 'clamp(24px, 3.5vmin, 34px)' }}
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Email */}
            <a
              href="mailto:jcdemerez@jcdemerez.com"
              aria-label="Enviar email"
              style={{
                color: 'inherit',
                opacity: 0.6,
                transition: 'opacity 0.3s',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
            >
              {/* Envelope SVG */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 'clamp(24px, 3.5vmin, 34px)', height: 'clamp(24px, 3.5vmin, 34px)' }}
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </a>
          </div>

          {/* Firma */}
          <div style={{
            fontSize: 'clamp(0.95rem, 1.85vmin, 1.15rem)',
            opacity: 0.6,
            letterSpacing: '0.05em',
          }}>
            JC de Merez
          </div>
        </div>
      </footer>

    </div>
  );
}
