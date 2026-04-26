'use client';

import { usePathname } from 'next/navigation';

function formatDate(ms: string | undefined): string {
  if (!ms) return 'Desconocida';
  const date = new Date(parseInt(ms));
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

export default function Sidebar() {
  const pathname = usePathname();
  
  const getActiveSection = () => {
    if (pathname.startsWith('/aforismos') || pathname.startsWith('/adagium')) return 'aforismos';
    if (pathname.startsWith('/dietario')) return 'dietario';
    if (pathname.startsWith('/la-balanza-de-minerva')) return 'balanza';
    if (pathname.startsWith('/biblioteca')) return 'biblioteca';
    if (pathname.startsWith('/acerca-de')) return 'acerca';
    return null;
  };
  
  const activeSection = getActiveSection();
  const lastUpdate = formatDate(process.env.VAULT_LAST_UPDATE_MS);

  return (
    <aside className="sidebar">

      {/* Logo + Subtitle */}
      <div className="sidebar-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <a href="/">
          <img
            src="/logo.png"
            alt="JC de Merez"
            className="sidebar-logo"
          />
        </a>
        <div className="sidebar-subtitle">nulla die sine aphorismus</div>
      </div>

      {/* ─── Top separator ─── */}
      <div className="sidebar-separator" />

      {/* ─── Navigation Links ─── */}
      <nav className="sidebar-nav">
        <a
          href="/aforismos"
          className={`sidebar-nav-item ${activeSection === 'aforismos' ? 'active' : ''}`}
        >
          <span className="nav-title">Aforismos</span>
        </a>

        <a
          href="/dietario"
          className={`sidebar-nav-item ${activeSection === 'dietario' ? 'active' : ''}`}
        >
          <span className="nav-title">Dietario</span>
        </a>

        <div className="sidebar-nav-mini-separator" />

        <a
          href="/la-balanza-de-minerva"
          className={`sidebar-nav-item ${activeSection === 'balanza' ? 'active' : ''}`}
        >
          <span className="nav-title">La Balanza de Minerva</span>
        </a>

        <div className="sidebar-nav-mini-separator" />

        <a
          href="/biblioteca"
          className={`sidebar-nav-item ${activeSection === 'biblioteca' ? 'active' : ''}`}
        >
          <span className="nav-title">Biblioteca</span>
        </a>
      </nav>

      {/* ─── Bottom section: Acerca de ─── */}
      <div className="sidebar-bottom">
        <a
          href="/acerca-de"
          className={`sidebar-nav-item ${activeSection === 'acerca' ? 'active' : ''}`}
        >
          <span className="nav-title">Acerca de</span>
        </a>
      </div>

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

      {/* Actualizado a... (al final del todo) */}
      <div className="sidebar-update">
        Actualizado a {lastUpdate}
      </div>
    </aside>
  );
}
