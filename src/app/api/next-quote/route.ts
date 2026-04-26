import { NextResponse } from 'next/server';
import { getAphorisms, EntryType } from '@/lib/aphorisms';

// Rate Limiting en memoria para detener spam rápido. (En Vercel esto se reinicia entre contenedores
// o despliegues, pero es suficiente para parar a bots que lanzan ráfagas a la misma instancia).
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 25; // 25 clicks por minuto
const ipMap = new Map<string, { count: number; firstRequestTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipMap.get(ip);
  
  if (process.env.NODE_ENV === 'development') {
    return true; // Bypass total en localhost / dev
  }

  if (!record) {
    ipMap.set(ip, { count: 1, firstRequestTime: now });
    return true;
  }
  
  if (now - record.firstRequestTime > RATE_LIMIT_WINDOW) {
    // Ha pasado el minuto, resetear
    ipMap.set(ip, { count: 1, firstRequestTime: now });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS) {
    return false; // Bloqueado
  }
  
  record.count++;
  return true;
}

export async function POST(req: Request) {
  // Extraer IP para rate limit
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 });
  }
  
  try {
    const body = await req.json();
    let seenIds: string[] = Array.isArray(body.seenIds) ? body.seenIds : [];
    
    // Antí-bot: si envían un listado enorme para que les demos los que faltan,
    // ignoramos su listado para que empiecen a ver repetidos y se fastidien.
    if (seenIds.length > 50) {
      seenIds = [];
    }
    const nextTodayIndex: number | undefined = typeof body.nextTodayIndex === 'number' ? body.nextTodayIndex : undefined;

    // Filtrar por tipo si se indica (aforismo o dietario). Default: aforismo
    const filterType: EntryType = body.type === 'dietario' ? 'dietario' : 'aforismo';
    const data = getAphorisms(filterType);
    
    // Si todavía quedan aforismos de "hoy" (prioritarios) y el cliente los pide
    if (nextTodayIndex !== undefined && nextTodayIndex >= 0 && nextTodayIndex < data.todayCount) {
      const availableToday = data.todayAphorisms.filter(a => !seenIds.includes(a.id));
      if (availableToday.length > 0) {
        const randomTodayIndex = Math.floor(Math.random() * availableToday.length);
        return NextResponse.json({
          aphorism: availableToday[randomTodayIndex],
          todayCount: data.todayCount
        });
      }
    }

    // De lo contrario, obtener uno al azar que NO haya sido visto
    let available = data.allAphorisms.filter(a => !seenIds.includes(a.id));
    
    if (available.length === 0) {
      // Si ya los vio todos, barajamos y empezamos de nuevo
      available = data.allAphorisms;
      if (available.length === 0) {
        const emptyMsg = filterType === 'dietario' 
          ? "No hay entradas en el dietario todavía."
          : "No hay aforismos disponibles.";
        return NextResponse.json({ aphorism: { id: "none", content: emptyMsg }, resetSeen: true });
      }
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    const chosen = available[randomIndex];

    return NextResponse.json({
      aphorism: chosen,
      resetSeen: available.length === data.allAphorisms.length && seenIds.length > 0
    });
    
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
