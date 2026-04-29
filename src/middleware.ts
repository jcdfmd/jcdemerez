import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  
  // Redirect adagium.es (y www.adagium.es) → jcdemerez.com/aforismos
  if (hostname.includes('adagium.es')) {
    const url = new URL(request.url);
    // Cualquier ruta en adagium.es se redirige a jcdemerez.com/aforismos + la ruta original
    // Ej: adagium.es/ → jcdemerez.com/aforismos
    // Ej: adagium.es/api/newsletter/unsubscribe?email=... → jcdemerez.com/api/newsletter/unsubscribe?email=...
    const path = url.pathname;
    
    // Las rutas de API se mantienen igual (para que los links de unsubscribe antiguos sigan funcionando)
    if (path.startsWith('/api/')) {
      return NextResponse.redirect(
        new URL(`${path}${url.search}`, 'https://jcdemerez.com'),
        301
      );
    }
    
    // Todo lo demás va a /aforismos
    return NextResponse.redirect(
      new URL(`/aforismos${url.search}`, 'https://jcdemerez.com'),
      301
    );
  }

  return NextResponse.next();
}

// Aplicar middleware a todas las rutas excepto assets estáticos
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon-jcdm-dark.png|favicon-jcdm-light.png|jcdm-logo.png|logo.png|ingest).*)',
  ],
};
