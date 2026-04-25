import { Client } from 'pg';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

// Utilizaremos require nativo o import temporal para ignorar advertencias de typescript si no tenemos frontmatter en npm (usando expresiones regulares como fallback)

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
    const recentAphorisms: string[] = [];

    if (fs.existsSync(vaultPath)) {
      const files = fs.readdirSync(vaultPath);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        if (file.startsWith('_') || file.toLowerCase().includes('calendario')) continue;

        const filePath = path.join(vaultPath, file);
        const fileContents = fs.readFileSync(filePath, 'utf8');

        // Parseo ligero (regex) ya que python-frontmatter no funciona en Node.js, y no instalamos gray-matter
        const frontmatterMatch = fileContents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
        let publishDay: string | null = null;

        if (frontmatterMatch) {
          const fm = frontmatterMatch[1];
          const dayMatch = fm.match(/publish_day:\s*['"]?(\d{2}-\d{2})['"]?/);
          if (dayMatch) {
            publishDay = dayMatch[1];
          }
        }

        if (publishDay && past7Days.includes(publishDay)) {
          const content = fileContents.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
          if (content.length > 0) {
            recentAphorisms.push(content);
          }
        }
      }
    }

    if (recentAphorisms.length === 0) {
      // Si no hay ninguno reciente (últimos 7 días), no enviamos ningún correo y el cron finaliza silenciosamente.
      return NextResponse.json({ message: 'No hay aforismos recientes para enviar' });
    }

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

    // Construir el asunto dinámico — aforismo completo, el gestor de correo trunca
    const previewAphorism = recentAphorisms[0] || '';
    const subjectLine = previewAphorism.replace(/;/g, ',') + '...';

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
    .subtitle {
      font-size: 1rem;
      opacity: 0.8;
      margin-bottom: 30px;
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
    .logo-container {
      margin-top: 40px;
      margin-bottom: 15px;
    }
    /* icon-light: icono negro para modo luz. icon-dark: icono blanco para modo oscuro (por convencion del web) */
    .logo-dark { display: none; }
    .logo-light { display: inline-block; width: 40px; height: 40px; }
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
    /* Soporte nativo para modo oscuro de la aplicación de correo */
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
      .logo-light { display: none !important; }
      .logo-dark { display: inline-block !important; width: 40px; height: 40px; }
      .footer a { color: #aaa !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title"><a href="https://jcdemerez.com/aforismos" style="text-decoration: none; color: inherit;">Aforismos</a></h1>
    <hr class="line-separator" />
    
    \${recentAphorisms.map((aph, idx) => \`
      <div class="aphorism">
        \${aph.split(';').join('<span style="display:block;margin-bottom:6px;"></span>')}
      </div>
      \${idx < recentAphorisms.length - 1 ? '<div class="separator">~</div>' : ''}
    \`).join('')}
    
    <div class="logo-container">
      <hr class="line-separator" />
    </div>

    <div class="signature">
      <a href="https://jcdemerez.com" style="text-decoration: none; color: inherit;">JC de Merez</a>
    </div>
    
    <div class="footer">
      Estás recibiendo este correo porque te has suscrito a las publicaciones de Adagium en jcdemerez.com/aforismos.<br><br>
      <a href="https://jcdemerez.com/api/newsletter/unsubscribe?email={{EMAIL}}">Darme de baja</a>
    </div>
  </div>
</body>
</html>
    `;

    const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
    
    // Preparar envíos en bloque (Batch API) para inyectar correctamente el email en los enlaces de cancelación de suscripción para cada usuario
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

    return NextResponse.json({ message: `Enviados ${recentAphorisms.length} aforismos a ${subscribers.length} suscriptores` });
  } catch (error) {
    console.error('Newsletter error:', error);
    return NextResponse.json({ error: 'Error enviando newsletter' }, { status: 500 });
  }
}
