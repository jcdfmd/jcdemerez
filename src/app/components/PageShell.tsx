'use client';

import { useState, useEffect } from 'react';

interface PageShellProps {
  title: string;
  children?: React.ReactNode;
}

export default function PageShell({ title, children }: PageShellProps) {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('Ha ocurrido un error. Inténtalo de nuevo.');

  // Detect dark mode
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    function checkDark() {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* TITLE */}
      <header style={{ flex: '0 0 auto', paddingTop: '3.5vmin', textAlign: 'center' }}>
        <h1 style={{
          fontSize: 'clamp(1.3rem, 3vmin, 1.9rem)',
          fontWeight: 'normal',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          opacity: 0.85,
        }}>
          {title}
        </h1>
      </header>

      {/* BODY MAIN CONTAINER */}
      <main style={{
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 clamp(8px, 2vmin, 20px)',
        minHeight: 0,
      }}>
        {children}
      </main>

      {/* FOOTER: Newsletter + Logo */}
      <footer style={{
        flex: '0 0 auto',
        paddingBottom: '4vmin',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4vmin'
      }}>
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
                  padding: '8px 14px',
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
                  padding: '8px 18px',
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

        {/* Logo — proper contrast on hover for both light and dark modes */}
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="JC de Merez"
            style={{
              width: 'clamp(32px, 4.6vmin, 46px)',
              height: 'clamp(32px, 4.6vmin, 46px)',
              filter: isDark ? 'invert(1)' : 'none',
              opacity: 0.35,
              transition: 'opacity 0.3s ease, filter 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              // In light mode: keep original dark logo (no invert). In dark mode: keep inverted (white).
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.35';
            }}
          />
        </a>
      </footer>
    </div>
  );
}
