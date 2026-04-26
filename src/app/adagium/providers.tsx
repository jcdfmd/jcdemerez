'use client';

import { useEffect } from 'react';

// PostHog se carga de forma ASÍNCRONA y OPCIONAL.
// Si falla por cualquier motivo (bloqueador, iOS incompatible, etc.),
// la app sigue funcionando sin analítica.
// Se accede al cliente PostHog a través de window.__posthog.

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      try {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        if (!key) return;

        const posthogModule = await import('posthog-js');
        const posthog = posthogModule.default || posthogModule;

        posthog.init(key, {
          api_host: '/ingest',
          ui_host: 'https://eu.posthog.com',
          capture_pageview: true
        });

        // Exponer para uso global seguro (sin React provider)
        (window as unknown as Record<string, unknown>).__posthog = posthog;
      } catch (e) {
        console.warn('[JCdM] PostHog no pudo cargar:', e);
      }
    })();
  }, []);

  return <>{children}</>;
}
