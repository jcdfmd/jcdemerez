import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ─── Preview de la Newsletter ──────────────────────────────────────────────
// Accesible SOLO con el token CRON_SECRET como query param:
//   https://jcdemerez.com/api/newsletter/preview?token=TU_CRON_SECRET
//
// Devuelve el HTML exacto que recibirían los suscriptores, sin enviar nada.

interface RecentEntry {
  content: string;
  type: 'aforismo' | 'dietario';
}

function getPast7Days() {
  const days = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    days.push(`${dayStr}-${monthStr}`);
  }
  return days;
}

export async function GET(request: Request) {
  // Autenticar con query param ?token=
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado. Usa ?token=TU_CRON_SECRET' }, { status: 401 });
  }

  const past7Days = getPast7Days();
  const vaultPath = path.join(process.cwd(), 'content', 'vault');
  const recentEntries: RecentEntry[] = [];

  if (fs.existsSync(vaultPath)) {
    const files = fs.readdirSync(vaultPath);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      if (file.startsWith('_') || file.toLowerCase().includes('calendario')) continue;

      const filePath = path.join(vaultPath, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');

      const frontmatterMatch = fileContents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      let publishDay: string | null = null;
      let entryType: 'aforismo' | 'dietario' = 'aforismo';

      if (frontmatterMatch) {
        const fm = frontmatterMatch[1];
        const dayMatch = fm.match(/publish_day:\s*['"]?(\d{2}-\d{2})['"]?/);
        if (dayMatch) publishDay = dayMatch[1];
        const typeMatch = fm.match(/type:\s*['"]?(aforismo|dietario)['"]?/);
        if (typeMatch) entryType = typeMatch[1] as 'aforismo' | 'dietario';
      }

      if (publishDay && past7Days.includes(publishDay)) {
        const content = fileContents.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
        if (content.length > 0) {
          recentEntries.push({ content, type: entryType });
        }
      }
    }
  }

  if (recentEntries.length === 0) {
    return new NextResponse(
      '<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2>No hay contenido de los últimos 7 días</h2><p>Los publish_day de las reflexiones no coinciden con los últimos 7 días.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const recentAphorisms = recentEntries.filter(e => e.type === 'aforismo');
  const recentDietario = recentEntries.filter(e => e.type === 'dietario');

  const aforismosHtml = recentAphorisms.length > 0 ? `
    <h1 class="title"><a href="https://jcdemerez.com/aforismos" style="text-decoration: none; color: inherit;">Aforismos</a></h1>
    <hr class="line-separator" />
    
    ${recentAphorisms.map((entry, idx) => `
      <div class="aphorism">
        ${entry.content.split(';').join('<span style="display:block;margin-bottom:6px;"></span>')}
      </div>
      ${idx < recentAphorisms.length - 1 ? '<div class="separator">~</div>' : ''}
    `).join('')}` : '';

  const dietarioHtml = recentDietario.length > 0 ? `
    ${recentAphorisms.length > 0 ? '<hr class="line-separator" />' : ''}
    <h1 class="title"><a href="https://jcdemerez.com/dietario" style="text-decoration: none; color: inherit;">Dietario</a></h1>
    <hr class="line-separator" />
    
    ${recentDietario.map((entry, idx) => `
      <div class="aphorism" style="line-height: 1.6;">
        ${entry.content.split('\n\n').map(p => `<p style="margin: 0.5em 0;">${p.trim()}</p>`).join('')}
      </div>
      ${idx < recentDietario.length - 1 ? '<div class="separator">~</div>' : ''}
    `).join('')}` : '';

  const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Caudex&display=swap');
    body {
      background-color: #F5F5E8;
      color: #111111;
      font-family: 'Caudex', serif;
      margin: 0;
      padding: 40px 20px;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
    }
    .title {
      font-size: 2rem;
      font-weight: 400;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
      margin-top: 0;
    }
    .aphorism {
      font-size: 1.1rem;
      line-height: 1.4;
      margin-bottom: 25px;
    }
    .separator {
      margin-bottom: 25px;
      font-size: 1.2rem;
      color: #111111;
    }
    hr.line-separator {
      width: 150px;
      border: none;
      border-top: 1px solid #111111;
      margin: 60px auto 60px auto;
      opacity: 0.3;
    }
    .signature {
      font-size: 1rem;
      opacity: 0.6;
      letter-spacing: 0.05em;
    }
    .footer {
      margin-top: 40px;
      font-size: 0.8rem;
      color: #888;
      font-family: sans-serif;
    }
    .footer a {
      color: #888;
      text-decoration: underline;
    }
    .preview-banner {
      background: #333;
      color: #fff;
      padding: 10px;
      text-align: center;
      font-family: sans-serif;
      font-size: 0.85rem;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a1a !important;
        color: #ffffff !important;
      }
      .separator {
        color: #ffffff !important;
      }
      hr.line-separator {
        border-top: 1px solid #ffffff !important;
      }
      .footer a { color: #aaa !important; }
    }
  </style>
</head>
<body>
  <div class="preview-banner">
    ⚠️ PREVIEW — Esto es lo que recibirían los suscriptores. No se ha enviado nada.
    <br>Entradas: ${recentAphorisms.length} aforismos + ${recentDietario.length} dietario (últimos 7 días)
  </div>
  <div class="container">
    ${aforismosHtml}
    ${dietarioHtml}
    
    <hr class="line-separator" />

    <div class="signature">
      <a href="https://jcdemerez.com" style="text-decoration: none; color: inherit;">JC de Merez</a>
    </div>
    
    <div class="footer">
      Estás recibiendo este correo porque te has suscrito a las publicaciones de JC de Merez en jcdemerez.com.<br><br>
      <a href="#">Darme de baja</a>
    </div>
  </div>
</body>
</html>
  `;

  return new NextResponse(emailHtml, {
    headers: { 'Content-Type': 'text/html' },
  });
}
