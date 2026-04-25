'use client';

import { useState, useEffect } from 'react';

export default function JCDemerezClient() {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('Ha ocurrido un error. Inténtalo de nuevo.');

  // Time-based dark/light mode: 7pm-7am = dark, 7am-7pm = light
  useEffect(() => {
    function applyTheme() {
      const hour = new Date().getHours();
      if (hour >= 19 || hour < 7) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    applyTheme();

    // Check every minute in case the user has the tab open across the threshold
    const interval = setInterval(applyTheme, 60_000);
    return () => clearInterval(interval);
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

  // Detect current dark mode for inline conditional styles
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

  return (
    <>
      {/* ═══════ SIDEBAR ═══════ */}
      <aside className="sidebar">

        {/* Logo + Title + Subtitle */}
        <div className="sidebar-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="JC de Merez"
            className="sidebar-logo"
          />
          <h1 className="sidebar-title">JC de Merez</h1>
          <div className="sidebar-subtitle">nulla die sine aphorismus</div>
        </div>

        {/* ─── Top separator ─── */}
        <div className="sidebar-separator" />

        {/* ─── Navigation Links ─── */}
        <nav className="sidebar-nav">
          <a href="/adagium" className="sidebar-nav-item">
            <h2 className="nav-title">Adagium</h2>
            <div className="nav-subtitle">ars brevis, vita longa</div>
          </a>

          <div className="sidebar-nav-item" style={{ cursor: 'default' }}>
            <h2 className="nav-title">La Balanza de Minerva</h2>
            <div className="nav-subtitle">aforismos prácticos y filosóficos</div>
          </div>

          <div className="sidebar-nav-item" style={{ cursor: 'default' }}>
            <h2 className="nav-title">Classicus</h2>
            <div className="nav-subtitle">biblioteca de obras eternas</div>
          </div>
        </nav>

        {/* ─── Bottom separator ─── */}
        <div className="sidebar-separator" />

        {/* ─── Footer: social icons + signature ─── */}
        <div className="sidebar-footer">
          {/* Social icons */}
          <div className="sidebar-social">
            {/* X.com (Twitter) */}
            <a
              href="https://x.com/jcdemerez"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X (Twitter)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Email */}
            <a
              href="mailto:jcdemerez@jcdemerez.com"
              aria-label="Enviar email"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </a>
          </div>

          {/* Signature */}
          <div className="sidebar-signature">JC de Merez</div>
        </div>
      </aside>

      {/* ═══════ MAIN CONTENT (empty on home) ═══════ */}
      <main className="main-content" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        {/* Home page: intentionally empty — content shows when navigating via sidebar */}
      </main>
    </>
  );
}
