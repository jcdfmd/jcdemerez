'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // On home page (/), sidebar is always visible (no burger needed)
  const isHome = pathname === '/';

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

  // Close sidebar on navigation (when user clicks a nav item)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Burger button — only visible on mobile when NOT on home */}
      {!isHome && (
        <button
          className="burger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Overlay backdrop */}
      {sidebarOpen && !isHome && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with conditional mobile classes */}
      <div className={`sidebar-wrapper ${isHome ? 'sidebar-home' : ''} ${sidebarOpen ? 'sidebar-mobile-open' : ''}`}>
        <Sidebar />
      </div>

      <div className={`main-content ${isHome ? 'main-home' : ''}`}>
        {children}
      </div>
    </>
  );
}
