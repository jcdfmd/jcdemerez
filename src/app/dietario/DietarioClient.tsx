'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

function getPostHog(): { capture: (event: string, properties?: Record<string, unknown>) => void } | null {
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__posthog) {
    return (window as unknown as Record<string, unknown>).__posthog as { capture: (event: string, properties?: Record<string, unknown>) => void };
  }
  return null;
}

export interface DietarioEntry {
  id: string;
  content: string;
}

interface Props {
  initialEntry: DietarioEntry;
  todayCount: number;
}

export default function DietarioClient({ initialEntry, todayCount }: Props) {
  const [currentEntry, setCurrentEntry] = useState<DietarioEntry>(initialEntry);
  const [nextEntryQueue, setNextEntryQueue] = useState<DietarioEntry | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([initialEntry.id]);
  const [sequenceViewed, setSequenceViewed] = useState(0);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [resetSeenQueue, setResetSeenQueue] = useState(false);
  const [readStartTime, setReadStartTime] = useState(Date.now());

  const [opacity, setOpacity] = useState(1);
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('Ha ocurrido un error. Inténtalo de nuevo.');

  const containerRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

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

  // Adaptive text sizing — similar logic to AdagiumClient but allows larger text for longer entries
  useEffect(() => {
    if (!textRef.current || !containerRef.current) return;

    const buttonEl = containerRef.current.querySelector('button');
    const buttonHeight = buttonEl ? buttonEl.offsetHeight : 0;
    const rawAvailable = containerRef.current.clientHeight - buttonHeight;
    const availableHeight = rawAvailable * 0.75;

    const vpH = typeof window !== 'undefined' ? window.innerHeight : 800;
    // Slightly smaller base for longer reflections
    let currentSize = Math.min(1.8, Math.max(0.9, vpH / 450));
    textRef.current.style.fontSize = `${currentSize}rem`;

    if (availableHeight < 50) return;

    let safeLoops = 0;
    while (
      textRef.current.scrollHeight > availableHeight &&
      currentSize > 0.7 &&
      safeLoops < 40
    ) {
      currentSize -= 0.04;
      textRef.current.style.fontSize = `${currentSize}rem`;
      safeLoops++;
    }
  }, [currentEntry]);

  // Pre-load next entry via the unified /api/next-quote with type=dietario
  useEffect(() => {
    if (nextEntryQueue || isLoadingNext || opacity === 0 || currentEntry.id === 'none') return;

    const fetchBackground = async () => {
      try {
        const response = await fetch('/api/next-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seenIds, type: 'dietario' })
        });

        if (response.ok) {
          const data = await response.json();
          setNextEntryQueue(data.aphorism);
          setResetSeenQueue(data.resetSeen);
        }
      } catch {
        // Silent on network error
      }
    };

    fetchBackground();
  }, [currentEntry, seenIds, nextEntryQueue, isLoadingNext, opacity]);

  const handleNext = useCallback(async () => {
    if (isLoadingNext || opacity === 0 || currentEntry.id === 'none') return;

    setIsLoadingNext(true);

    try {
      try { getPostHog()?.capture('Dietario Terminado', { entry_id: currentEntry.id, reading_time_seconds: (Date.now() - readStartTime) / 1000 }); } catch (_) {}

      setOpacity(0);
      await new Promise(r => setTimeout(r, 500));

      if (nextEntryQueue) {
        if (resetSeenQueue) {
          setSeenIds([nextEntryQueue.id]);
        } else {
          setSeenIds(prev => [...prev, nextEntryQueue.id]);
        }

        try { getPostHog()?.capture('Dietario Mostrado', { entry_id: nextEntryQueue.id }); } catch (_) {}
        setReadStartTime(Date.now());
        setCurrentEntry(nextEntryQueue);
        setNextEntryQueue(null);
      } else {
        try {
          const response = await fetch('/api/next-quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seenIds, type: 'dietario' })
          });

          if (!response.ok) {
            if (response.status === 429) setSeenIds([]);
            setCurrentEntry({ id: 'error-429', content: `Error del servidor: ${response.status}.` });
            return;
          }

          const data = await response.json();
          if (data.resetSeen) {
            setSeenIds([data.aphorism.id]);
          } else {
            setSeenIds(prev => [...prev, data.aphorism.id]);
          }

          try { getPostHog()?.capture('Dietario Mostrado (No-Prefetch)', { entry_id: data.aphorism.id }); } catch (_) {}
          setReadStartTime(Date.now());
          setCurrentEntry(data.aphorism);
        } catch (e) {
          console.error(e);
          setCurrentEntry({ id: 'error-fetch', content: `Error de red. Inténtalo de nuevo.` });
        }
      }
    } finally {
      setTimeout(() => {
        setOpacity(1);
        setIsLoadingNext(false);
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingNext, opacity, currentEntry, nextEntryQueue, resetSeenQueue, seenIds, readStartTime]);

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
          Dietario
        </h1>
      </header>

      {/* BODY MAIN CONTAINER */}
      <main
        ref={containerRef}
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 clamp(8px, 2vmin, 20px)',
          minHeight: 0,
        }}
      >
        <div
          ref={textRef}
          style={{
            maxWidth: '750px',
            width: '95%',
            textAlign: 'center',
            lineHeight: 1.6,
            opacity: opacity,
            transition: 'opacity 0.5s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {currentEntry.content.split('\n\n').map((paragraph, idx) => {
            const text = paragraph.trim();
            if (!text) return null;
            return (
              <p key={idx} style={{ textWrap: 'balance', width: '100%', margin: '0.5em auto' }}>
                {text}
              </p>
            );
          })}
        </div>

        {/* Roulette / Refresh BUTTON */}
        <button
          type="button"
          onClick={handleNext}
          className="roulette-btn"
          style={{
            marginTop: '4vmin',
            cursor: 'pointer',
            padding: '6px',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
            background: 'none',
            border: 'none',
            color: 'inherit',
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
          aria-label="Siguiente reflexión"
        >
          <svg
            className={`roulette-icon ${isLoadingNext ? 'spinning' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
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

        {/* Firma */}
        <a
          href="https://jcdemerez.com"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            opacity: 0.4,
            fontSize: 'clamp(0.85rem, 1.7vmin, 1.1rem)',
            letterSpacing: '0.05em',
            transition: 'opacity 0.3s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; }}
        >
          JC de Merez
        </a>
      </footer>
    </div>
  );
}
