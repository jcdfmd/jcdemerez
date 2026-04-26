import { Client } from 'pg';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  let client;
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    client = new Client({ 
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false } 
    });
    await client.connect();

    await client.query('DELETE FROM subscribers WHERE email = $1', [email]);
    await client.end();

    // Respuesta simple con formato minimalista
    const htmlResponse = `
<!DOCTYPE html>
<html lang="es">
<head>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Caudex&display=swap');
    body {
      background-color: #F5F5E8;
      color: #111111;
      font-family: 'Caudex', serif;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      text-align: center;
      margin: 0;
    }
    .msg {
      font-size: 1.2rem;
      opacity: 0.8;
      letter-spacing: 0.05em;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a1a;
        color: #F5F5E8;
      }
    }
  </style>
</head>
<body>
  <div class="msg">Te has dado de baja de forma exitosa.</div>
</body>
</html>
    `;

    return new NextResponse(htmlResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error('Error unsuscribing:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
