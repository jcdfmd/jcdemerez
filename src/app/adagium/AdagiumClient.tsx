'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Acceso seguro a PostHog: se carga de forma asíncrona en providers.tsx
// y se expone como window.__posthog. Si no está disponible, simplemente no se envía analítica.
function getPostHog(): { capture: (event: string, properties?: Record<string, unknown>) => void } | null {
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__posthog) {
    return (window as unknown as Record<string, unknown>).__posthog as { capture: (event: string, properties?: Record<string, unknown>) => void };
  }
  return null;
}
export interface Aphorism {
  id: string;
  content: string;
}

interface Props {
  initialAphorism: Aphorism;
  todayCount: number;
}

export default function AdagiumClient({ initialAphorism, todayCount }: Props) {
  const [currentAphorism, setCurrentAphorism] = useState<Aphorism>(initialAphorism);
  const [nextAphorismQueue, setNextAphorismQueue] = useState<Aphorism | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([initialAphorism.id]);
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

  // Detect dark mode for conditional styles (theme is managed by LayoutShell)
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

  // Modificador adaptativo anti-scroll + balance de líneas
  useEffect(() => {
    if (!textRef.current || !containerRef.current) return;
    
    // Calcular espacio disponible para el texto (main - botón de la ruleta)
    const buttonEl = containerRef.current.querySelector('button');
    const buttonHeight = buttonEl ? buttonEl.offsetHeight : 0;
    const rawAvailable = containerRef.current.clientHeight - buttonHeight;
    // El texto solo llena ~75% del espacio disponible — el 25% restante
    // mantiene los márgenes proporcionales arriba y abajo del texto.
    const availableHeight = rawAvailable * 0.75;

    // Tamaño inicial proporcional al viewport:
    // ~2.2rem en pantallas grandes (800px+), ~1.6rem en iPhone SE (568px),
    // ~1.3rem en iPad horizontal (~400px visible)
    const vpH = typeof window !== 'undefined' ? window.innerHeight : 800;
    let currentSize = Math.min(2.2, Math.max(1.0, vpH / 370));
    textRef.current.style.fontSize = `${currentSize}rem`;

    // Resetear max-width de segmentos antes de medir
    const segments = textRef.current.querySelectorAll('[data-segment]');
    segments.forEach(seg => { (seg as HTMLElement).style.maxWidth = ''; });

    // Reducir más la fuente si aún desborda la altura disponible
    if (availableHeight < 50) return;

    let safeLoops = 0;
    while (
      textRef.current.scrollHeight > availableHeight && 
      currentSize > 0.8 && // límite inferior
      safeLoops < 30
    ) {
      currentSize -= 0.05; // pasos más finos para ajuste preciso
      textRef.current.style.fontSize = `${currentSize}rem`;
      safeLoops++;
    }

    // Balanceo de líneas (fallback JS para navegadores sin text-wrap: balance).
    // Para cada segmento, reduce el ancho hasta que las líneas queden simétricas.
    segments.forEach(seg => {
      const el = seg as HTMLElement;
      const originalHeight = el.scrollHeight;
      const originalWidth = el.offsetWidth;
      
      // Solo balancear si hay más de una línea (text wraps)
      if (originalHeight <= parseFloat(getComputedStyle(el).lineHeight) * 1.5) return;
      
      // Reducir ancho progresivamente hasta que se añada una línea extra
      let testWidth = originalWidth;
      while (testWidth > originalWidth * 0.5) {
        testWidth -= 4;
        el.style.maxWidth = testWidth + 'px';
        if (el.scrollHeight > originalHeight) {
          // Se añadió una línea — volver al ancho anterior (justo antes del salto)
          el.style.maxWidth = (testWidth + 4) + 'px';
          break;
        }
      }
    });
  }, [currentAphorism]); // Se ejecuta cada vez que cambiamos de reflexión

  // Pre-cargar el siguiente aforismo en background si no lo tenemos aún
  useEffect(() => {
    if (nextAphorismQueue || isLoadingNext || opacity === 0 || currentAphorism.id === 'none') return;
    
    const fetchBackground = async () => {
      try {
        let nextTodayIndex: number | undefined = undefined;
        let nextSequenceViewed = sequenceViewed;
        if (sequenceViewed < todayCount - 1) {
          nextSequenceViewed = sequenceViewed + 1;
          nextTodayIndex = nextSequenceViewed;
        }

        const response = await fetch('/api/next-quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seenIds, nextTodayIndex })
        });
        
        if (response.ok) {
          const data = await response.json();
          setNextAphorismQueue(data.aphorism);
          setResetSeenQueue(data.resetSeen);
          setSequenceViewed(nextSequenceViewed);
        }
      } catch (e) {
        // Silencioso en caso de error de red secundario
      }
    };
    
    fetchBackground();
  }, [currentAphorism, seenIds, nextAphorismQueue, isLoadingNext, opacity, sequenceViewed, todayCount]);

  const handleNext = useCallback(async () => {
    if (isLoadingNext || opacity === 0 || currentAphorism.id === 'none') return;
    
    setIsLoadingNext(true);

    try {
      try { getPostHog()?.capture('Aforismo Terminado', { aphorism_id: currentAphorism.id, reading_time_seconds: (Date.now() - readStartTime) / 1000 }); } catch (_) {}
      
      setOpacity(0);
      await new Promise(r => setTimeout(r, 500));
      
      if (nextAphorismQueue) {
        if (resetSeenQueue) {
          setSeenIds([nextAphorismQueue.id]);
        } else {
          setSeenIds(prev => [...prev, nextAphorismQueue.id]);
        }
        
        try { getPostHog()?.capture('Aforismo Mostrado', { aphorism_id: nextAphorismQueue.id }); } catch (_) {}
        setReadStartTime(Date.now());
        setCurrentAphorism(nextAphorismQueue);
        setNextAphorismQueue(null);
      } else {
        try {
          let nextTodayIndex: number | undefined = undefined;
          if (sequenceViewed < todayCount - 1) {
            nextTodayIndex = sequenceViewed + 1;
            setSequenceViewed(nextTodayIndex);
          }
          const response = await fetch('/api/next-quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seenIds, nextTodayIndex })
          });

          if (!response.ok) {
            if (response.status === 429) setSeenIds([]);
            setCurrentAphorism({ id: 'error-429', content: `Error del servidor: ${response.status}.` });
            return;
          }

          const data = await response.json();
          if (data.resetSeen) {
            setSeenIds([data.aphorism.id]);
          } else {
            setSeenIds(prev => [...prev, data.aphorism.id]);
          }
          
          try { getPostHog()?.capture('Aforismo Mostrado (No-Prefetch)', { aphorism_id: data.aphorism.id }); } catch (_) {}
          setReadStartTime(Date.now());
          setCurrentAphorism(data.aphorism);
        } catch (e) {
          console.error(e);
          setCurrentAphorism({ id: 'error-fetch', content: `Error de red. Inténtalo de nuevo.` });
        }
      }
    } finally {
      setTimeout(() => {
        setOpacity(1);
        setIsLoadingNext(false);
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingNext, opacity, currentAphorism, nextAphorismQueue, resetSeenQueue, seenIds, sequenceViewed, todayCount, readStartTime]);


  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (honeypot) {
      setStatus('success'); // Falso positivo para ahuyentar bots
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
          fontSize: 'clamp(1.6rem, 3.8vmin, 2.4rem)',
          fontWeight: 'normal',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          opacity: 0.85,
        }}>
          Aforismos
        </h1>
      </header>

      {/* BODY MAIN CONTAINER: Aphorism */}
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
            lineHeight: 1.4,
            opacity: opacity,
            transition: 'opacity 0.5s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {currentAphorism.content.split(';').map((segment, idx, arr) => {
            const text = segment.trim();
            if (!text) return null; // Evitar divs vacíos si termina en ;
            
            return (
              <div key={idx} data-segment style={{ textWrap: 'balance', width: '100%', margin: '0 auto' }}>
                {text}{idx < arr.length - 1 ? ';' : ''}
              </div>
            );
          })}
        </div>

        {/* INDICATOR: Roulette / Refresh BUTTON */}
        <button 
          type="button"
          onClick={handleNext}
          style={{ 
            marginTop: '2vmin',
            cursor: 'pointer',
            opacity: isLoadingNext ? 0.2 : 0.5,
            transition: 'opacity 0.3s ease',
            padding: 'clamp(12px, 2.5vmin, 25px)',
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
          {/* Single circular arrow — thick stroke, one arrowhead */}
          <svg
            style={{
              width: 'clamp(28px, 3.8vmin, 36px)',
              height: 'clamp(28px, 3.8vmin, 36px)',
              pointerEvents: 'none',
            }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* ~300° clockwise arc from upper-right to upper-left */}
            <path d="M 18.9 6.2 A 9 9 0 1 1 5.1 6.2" />
            {/* Single arrowhead at the end (upper-left), pointing clockwise */}
            <polyline points="2.5 3.8 5.1 6.2 7.7 3.8" />
          </svg>
        </button>
      </main>

      {/* FOOTER: Newsletter + Logo (sin firma) */}
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

        {/* Logo only — links to jcdemerez.com, opacity + white on hover */}
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
              e.currentTarget.style.filter = 'invert(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.35';
              e.currentTarget.style.filter = isDark ? 'invert(1)' : 'none';
            }}
          />
        </a>
      </footer>

    </div>
  );
}
