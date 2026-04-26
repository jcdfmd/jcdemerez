import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { buildNewsletterHtml } from '../preview/route';

// ─── Test Newsletter ────────────────────────────────────────────────────────
// Envía el email de prueba a una dirección específica.
// Uso: GET /api/newsletter/test?token=TU_CRON_SECRET&to=email@ejemplo.com
//
// Si no hay contenido real en los últimos 7 días, usa entradas de ejemplo
// para que puedas ver el diseño completo.

interface RecentEntry {
  content: string;
  type: 'aforismo' | 'dietario';
}

const SAMPLE_ENTRIES: RecentEntry[] = [
  { content: 'La tristeza sonríe con mayor frecuencia que la propia felicidad.', type: 'aforismo' },
  { content: 'No es tan esclavo quien sirve a un amo como quien gobierna una multitud de súbditos.', type: 'aforismo' },
  { content: 'Quien anuncia lo que da, más que dar, anuncia.', type: 'aforismo' },
];

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
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const to = searchParams.get('to');

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado. Usa ?token=TU_CRON_SECRET' }, { status: 401 });
  }

  if (!to || !to.includes('@')) {
    return NextResponse.json({ error: 'Falta el destinatario. Usa &to=tu@email.com' }, { status: 400 });
  }

  // Intentar cargar contenido real del vault
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

  // Si no hay entradas reales, usar las de ejemplo
  const entries = recentEntries.length > 0 ? recentEntries : SAMPLE_ENTRIES;
  const usingSamples = recentEntries.length === 0;

  const emailHtml = buildNewsletterHtml(entries, { preview: false })
    .replace('{{EMAIL}}', encodeURIComponent(to));

  const resend = new Resend(process.env.RESEND_API_KEY);

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Falta RESEND_API_KEY en las variables de entorno' }, { status: 500 });
  }

  const { data, error } = await resend.emails.send({
    from: 'JC de Merez <jcdemerez@jcdemerez.com>',
    reply_to: 'jcdemerez@jcdemerez.com',
    to: [to],
    subject: `[TEST] Newsletter JC de Merez${usingSamples ? ' (entradas de ejemplo)' : ''}`,
    html: emailHtml,
  });

  if (error) {
    console.error('Error enviando test:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `Email de prueba enviado a ${to}`,
    usingSamples,
    entriesCount: entries.length,
    emailId: data?.id,
  });
}
