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
      <div style="font-family:'Caudex',Palatino,'Palatino Linotype',Georgia,serif;font-size:19px;line-height:1.6;margin-bottom:28px;padding:0 10px;">
        ${formattedContent}
      </div>
      ${idx < shuffled.length - 1 ? '<div class="tilde-sep" style="margin-bottom:28px;font-family:\'Caudex\',Palatino,Georgia,serif;font-size:21px;color:#111111;opacity:0.5;">~</div>' : ''}
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
  <link href="https://fonts.googleapis.com/css2?family=Caudex&display=swap" rel="stylesheet">
  <style>
    body {
      background-color: #F5F5E8;
      color: #111111;
      font-family: 'Caudex', Georgia, 'Times New Roman', serif;
      margin: 0;
      padding: 40px 20px;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Dark Mode ── */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a1a !important;
        color: #e8e8e8 !important;
      }
      .line-separator {
        border-top-color: #e8e8e8 !important;
      }
      .tilde-sep {
        color: #e8e8e8 !important;
      }
      .header-logo {
        filter: invert(1) !important;
      }
      .social-link {
        color: #e8e8e8 !important;
      }
      .footer-text { color: #777 !important; }
      .footer-text a { color: #999 !important; }
    }
  </style>
</head>
<body style="background-color:#F5F5E8;color:#111111;font-family:'Caudex',Palatino,'Palatino Linotype',Georgia,serif;margin:0;padding:40px 20px;">
  ${previewBanner}
  <div style="max-width:600px;margin:0 auto;text-align:center;">

    <!-- HEADER: Logo + Subtitle -->
    <div style="padding-top:20px;">
      <a href="https://jcdemerez.com" style="text-decoration:none;border:none;">
        <img src="https://jcdemerez.com/logo.png" alt="JC de Merez" class="header-logo" style="width:64px;height:64px;" width="64" height="64" />
      </a>
      <div style="font-family:'Caudex',Palatino,'Palatino Linotype',Georgia,serif;font-size:18px;opacity:0.7;letter-spacing:0.08em;margin-top:14px;">nulla die sine aphorismus</div>
    </div>

    <!-- Separator -->
    <hr class="line-separator" style="width:250px;border:none;border-top:1px solid #111111;margin:55px auto;opacity:0.25;" />

    <!-- ENTRIES (aforismos + dietario mezclados) -->
    ${entriesHtml}

    <!-- Separator -->
    <hr class="line-separator" style="width:250px;border:none;border-top:1px solid #111111;margin:55px auto;opacity:0.25;" />

    <!-- SOCIAL ICONS - SVGs hospedados en jcdemerez.com -->
    <div style="margin-bottom:20px;">
      <a href="https://x.com/jcdemerez" target="_blank" style="display:inline-block;margin:0 14px;text-decoration:none;" title="X (Twitter)">
        <img src="https://jcdemerez.com/x-icon.svg" alt="X (Twitter)" width="24" height="24" style="vertical-align:middle;opacity:0.6;" />
      </a>
      <a href="mailto:jcdemerez@jcdemerez.com" style="display:inline-block;margin:0 14px;text-decoration:none;" title="Email">
        <img src="https://jcdemerez.com/email-icon.svg" alt="Email" width="24" height="24" style="vertical-align:middle;opacity:0.6;" />
      </a>
    </div>

    <!-- SIGNATURE -->
    <div style="font-family:'Caudex',Palatino,'Palatino Linotype',Georgia,serif;font-size:16px;opacity:0.6;letter-spacing:0.05em;">
      <a href="https://jcdemerez.com" style="text-decoration:none;color:inherit;">JC de Merez</a>
    </div>

    <!-- FOOTER -->
    <div class="footer-text" style="margin-top:40px;font-size:12px;color:#888;font-family:-apple-system,Arial,sans-serif;line-height:1.5;">
      Estás recibiendo este correo porque te has suscrito en jcdemerez.com.<br><br>
      <a href="https://jcdemerez.com/api/newsletter/unsubscribe?email={{EMAIL}}" style="color:#888;text-decoration:underline;">Darme de baja</a>
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
