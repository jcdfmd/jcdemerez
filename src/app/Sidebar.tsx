'use client';

export default function Sidebar() {
  return (
    <aside className="sidebar">

      {/* Logo + Subtitle (sin título) */}
      <div className="sidebar-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="JC de Merez"
          className="sidebar-logo"
        />
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
  );
}
