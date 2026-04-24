import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ─── Publicación de aforismos en X/Twitter ──────────────────────────────────
// Llamado cada hora por cron-job.org (servicio externo gratuito).
// Compara publish_day + publish_time de cada aforismo contra la hora actual
// de España peninsular. Si coinciden, publica.
//
// Autenticación: Bearer token vía TWEET_CRON_KEY (variable de Vercel).

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tweetCronKey = process.env.TWEET_CRON_KEY;
  const cronSecret = process.env.CRON_SECRET;

  // Acepta auth vía header Authorization O vía query param ?key=
  const authHeader = request.headers.get('authorization');
  const queryKey = searchParams.get('key');

  const isVercelCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isHeaderAuth = tweetCronKey && authHeader === `Bearer ${tweetCronKey}`;
  const isQueryAuth = tweetCronKey && queryKey === tweetCronKey;

  // Modo debug: si se pasa ?debug=1 sin auth, devuelve info de diagnóstico (sin revelar valores)
  if (searchParams.get('debug') === '1' && !isVercelCron && !isHeaderAuth && !isQueryAuth) {
    return NextResponse.json({
      debug: true,
      hasTweetCronKey: !!tweetCronKey,
      tweetCronKeyLength: tweetCronKey?.length ?? 0,
      hasCronSecret: !!cronSecret,
      authHeaderPresent: !!authHeader,
      authHeaderPrefix: authHeader?.slice(0, 15) ?? null,
      queryKeyPresent: !!queryKey,
    });
  }

  if (!isVercelCron && !isHeaderAuth && !isQueryAuth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Calcular día y hora actuales en hora de España peninsular
    const now = new Date();
    const spainFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    });
    const parts = spainFormatter.formatToParts(now);
    const day = parts.find(p => p.type === 'day')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const hour = parts.find(p => p.type === 'hour')!.value;

    const currentDay = `${day}-${month}`; // Ej: 24-04
    const currentHour = hour.padStart(2, '0'); // Ej: 10

    console.log(`[Tweet Cron] Despertando: ${currentDay} a las ${currentHour}:00 (España)`);

    // Leer la bóveda
    const vaultPath = path.join(process.cwd(), 'content', 'vault');
    if (!fs.existsSync(vaultPath)) {
      return NextResponse.json({ message: 'Bóveda no encontrada' });
    }

    const files = fs.readdirSync(vaultPath);
    const aforismosAPublicar: string[] = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      if (file.startsWith('_') || file.toLowerCase().includes('calendario')) continue;

      const filePath = path.join(vaultPath, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');

      // Parseo ligero del frontmatter
      const frontmatterMatch = fileContents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if (!frontmatterMatch) continue;

      const fm = frontmatterMatch[1];
      const dayMatch = fm.match(/publish_day:\s*['"]?(\d{2}-\d{2})['"]?/);
      const timeMatch = fm.match(/publish_time:\s*['"]?(\d{1,2}):\d{2}['"]?/);

      if (!dayMatch || !timeMatch) continue;

      const publishDay = dayMatch[1];
      const publishHour = timeMatch[1].padStart(2, '0');

      // Coincidencia exacta: mismo día Y misma hora
      if (publishDay === currentDay && publishHour === currentHour) {
        const content = fileContents.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
        if (content.length > 0) {
          aforismosAPublicar.push(content);
        }
      }
    }

    if (aforismosAPublicar.length === 0) {
      console.log(`[Tweet Cron] Silencio. Ningún aforismo para ${currentDay} a las ${currentHour}:00.`);
      return NextResponse.json({
        message: `Ningún aforismo programado para ${currentDay} a las ${currentHour}:00`,
        day: currentDay,
        hour: currentHour,
      });
    }

    // Verificar credenciales de Twitter/X
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      console.error('[Tweet Cron] Faltan credenciales de Twitter.');
      return NextResponse.json({ error: 'Faltan credenciales de Twitter' }, { status: 500 });
    }

    // Publicar cada aforismo de esta hora
    const resultados: { text: string; status: string; tweetId?: string; error?: string }[] = [];

    for (const text of aforismosAPublicar) {
      const tweetText = text.length > 280 ? text.slice(0, 277) + '...' : text;

      try {
        const result = await postTweet(tweetText, apiKey, apiSecret, accessToken, accessSecret);
        resultados.push({ text: tweetText, status: 'publicado', tweetId: result.tweetId });
        console.log(`[Tweet Cron] ✓ Publicado: "${tweetText.slice(0, 60)}..."`);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        resultados.push({ text: tweetText, status: 'error', error: errorMsg });
        console.error(`[Tweet Cron] ✗ Error: ${errorMsg}`);
      }
    }

    return NextResponse.json({
      message: `${currentDay} ${currentHour}:00 — ${resultados.filter(r => r.status === 'publicado').length}/${aforismosAPublicar.length} publicados`,
      resultados,
    });
  } catch (error) {
    console.error('[Tweet Cron] Error general:', error);
    return NextResponse.json({ error: 'Error en el cron de tweets' }, { status: 500 });
  }
}


// ─── Twitter/X API v2 — OAuth 1.0a nativo (sin dependencias externas) ───────

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');
  const signatureBase = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

async function postTweet(
  text: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): Promise<{ tweetId?: string }> {
  const url = 'https://api.x.com/2/tweets';
  const method = 'POST';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(method, url, oauthParams, consumerSecret, accessTokenSecret);
  oauthParams.oauth_signature = signature;

  const authHeaderValue = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': authHeaderValue,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(data)}`);
  }

  return { tweetId: data?.data?.id };
}
