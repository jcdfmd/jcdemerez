import { Client } from 'pg';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { buildNewsletterHtml } from '../preview/route';

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
  // Verificar token de Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
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
      return NextResponse.json({ message: 'No hay contenido reciente para enviar' });
    }

    // Generar HTML — mismo diseño que el preview, sin el banner
    const emailHtml = buildNewsletterHtml(recentEntries, { preview: false });

    // Obtener suscriptores
    const client = new Client({ 
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false } 
    });
    await client.connect();
    const { rows: subscribers } = await client.query('SELECT email FROM subscribers');
    await client.end();
    
    if (subscribers.length === 0) {
      return NextResponse.json({ message: 'No hay suscriptores' });
    }

    // Construir asunto dinámico
    const previewText = recentEntries[0].content.replace(/;/g, ',').replace(/\n/g, ' ').slice(0, 200);
    const subjectLine = previewText + '...';

    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
    
    const chunkSize = 100;
    const allBatchResponses = [];
    
    for (let i = 0; i < subscribers.length; i += chunkSize) {
      const chunk = subscribers.slice(i, i + chunkSize);
      
      const batchData = chunk.map((sub: any) => ({
        from: 'JC de Merez <jcdemerez@jcdemerez.com>',
        reply_to: 'jcdemerez@jcdemerez.com',
        to: [sub.email as string],
        subject: subjectLine,
        html: emailHtml.replace('{{EMAIL}}', encodeURIComponent(sub.email as string))
      }));

      const response = await resend.batch.send(batchData);
      allBatchResponses.push(response);
    }

    return NextResponse.json({ 
      message: `Enviadas ${recentEntries.length} reflexiones a ${subscribers.length} suscriptores` 
    });
  } catch (error) {
    console.error('Newsletter error:', error);
    return NextResponse.json({ error: 'Error enviando newsletter' }, { status: 500 });
  }
}
