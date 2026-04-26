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

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildNewsletterHtml(entries: RecentEntry[], options?: { preview?: boolean }) {
  const isPreview = options?.preview ?? false;

  // Mezclar aforismos y dietario en orden aleatorio
  const shuffled = shuffle(entries);

  const entriesHtml = shuffled.map((entry, idx) => {
    // Aforismos usan ; como salto visual, dietario usa párrafos
    const formattedContent = entry.type === 'dietario'
      ? entry.content.split('\n\n').map(p => `<p style="margin: 0.5em 0;">${p.trim()}</p>`).join('')
      : entry.content.split(';').join('<span style="display:block;margin-bottom:6px;"></span>');

    return `
      <div class="entry">
        ${formattedContent}
      </div>
      ${idx < shuffled.length - 1 ? '<div class="separator">~</div>' : ''}
    `;
  }).join('');

  const previewBanner = isPreview ? `
  <div style="background:#333;color:#fff;padding:10px;text-align:center;font-family:sans-serif;font-size:0.85rem;position:sticky;top:0;z-index:100;">
    ⚠️ PREVIEW — Esto es lo que recibirían los suscriptores. No se ha enviado nada.
    <br>${entries.length} reflexiones (últimos 7 días)
  </div>` : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

    /* ── Header: Logo + Subtitle ── */
    .header {
      padding-top: 20px;
      padding-bottom: 0;
    }
    .header-logo {
      width: 48px;
      height: 48px;
    }

    .header-subtitle {
      font-size: 1.1rem;
      opacity: 0.7;
      letter-spacing: 0.08em;
      margin-top: 14px;
    }

    /* ── Separators ── */
    hr.line-separator {
      width: 250px;
      border: none;
      border-top: 1px solid #111111;
      margin: 55px auto;
      opacity: 0.25;
    }

    /* ── Entries ── */
    .entry {
      font-size: 1.2rem;
      line-height: 1.6;
      margin-bottom: 28px;
      padding: 0 10px;
    }
    .separator {
      margin-bottom: 28px;
      font-size: 1.3rem;
      color: #111111;
      opacity: 0.5;
    }

    /* ── Social Icons ── */
    .social {
      margin-bottom: 20px;
    }
    .social a {
      display: inline-block;
      margin: 0 14px;
      color: #111111;
      text-decoration: none;
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    .social-icon {
      width: 22px;
      height: 22px;
      vertical-align: middle;
    }

    /* ── Signature ── */
    .signature {
      font-size: 1rem;
      opacity: 0.6;
      letter-spacing: 0.05em;
    }
    .signature a {
      text-decoration: none;
      color: inherit;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 40px;
      font-size: 0.75rem;
      color: #888;
      font-family: -apple-system, sans-serif;
      line-height: 1.5;
    }
    .footer a {
      color: #888;
      text-decoration: underline;
    }

    /* ── Dark Mode ── */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a1a !important;
        color: #e8e8e8 !important;
      }
      hr.line-separator {
        border-top-color: #e8e8e8 !important;
      }
      .separator {
        color: #e8e8e8 !important;
      }
      .header-logo {
        filter: invert(1) !important;
      }
      .social-icon {
        filter: invert(1) !important;
      }
      .footer { color: #777 !important; }
      .footer a { color: #999 !important; }
    }
  </style>
</head>
<body>
  ${previewBanner}
  <div class="container">

    <!-- HEADER: Logo + Subtitle -->
    <div class="header">
      <a href="https://jcdemerez.com" style="text-decoration:none;border:none;">
        <img src="https://jcdemerez.com/logo.png" alt="JC de Merez" class="header-logo" />
      </a>
      <div class="header-subtitle">nulla die sine aphorismus</div>
    </div>

    <!-- Separator -->
    <hr class="line-separator" />

    <!-- ENTRIES (aforismos + dietario mezclados) -->
    ${entriesHtml}

    <!-- Separator -->
    <hr class="line-separator" />

    <!-- SOCIAL ICONS -->
    <div class="social">
      <a href="https://x.com/jcdemerez" target="_blank" title="X (Twitter)">
        <!--[if mso]><img src="https://jcdemerez.com/x-icon.png" width="22" height="22" /><![endif]-->
        <!--[if !mso]><!-->
        <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        <!--<![endif]-->
      </a>
      <a href="mailto:jcdemerez@jcdemerez.com" title="Email">
        <!--[if mso]><img src="https://jcdemerez.com/email-icon.png" width="22" height="22" /><![endif]-->
        <!--[if !mso]><!-->
        <svg class="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        <!--<![endif]-->
      </a>
    </div>

    <!-- SIGNATURE -->
    <div class="signature">
      <a href="https://jcdemerez.com">JC de Merez</a>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      Estás recibiendo este correo porque te has suscrito en jcdemerez.com.<br><br>
      <a href="https://jcdemerez.com/api/newsletter/unsubscribe?email={{EMAIL}}">Darme de baja</a>
    </div>

  </div>
</body>
</html>
  `;
}

export async function GET(request: Request) {
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
      '<html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2>No hay contenido de los últimos 7 días</h2><p>Los publish_day de las reflexiones no coinciden con los últimos 7 días.</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const emailHtml = buildNewsletterHtml(recentEntries, { preview: true });

  return new NextResponse(emailHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
