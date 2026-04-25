'use client';

import { useEffect } from 'react';
import Sidebar from './Sidebar';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
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

  return (
    <>
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </>
  );
}
