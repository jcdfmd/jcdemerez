import { Client } from 'pg';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let client;
  try {
    const { email, honeypot }: { email: string, honeypot?: string } = await request.json();

    // Spam protection (Honeypot)
    if (honeypot) {
      return NextResponse.json({ message: 'Suscrito con éxito' }, { status: 200 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    client = new Client({ 
      connectionString: process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false } 
    });

    // Timeout de 8 segundos para evitar 504 Gateway Timeout infinito
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout conectando a Postgres. ¿URL bloqueada o errónea?")), 8000));
    await Promise.race([connectPromise, timeoutPromise]);

    // Asegurarse de que la tabla existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insertar el correo — misma tabla que adagium.es
    await client.query(`
      INSERT INTO subscribers (email)
      VALUES ($1)
      ON CONFLICT (email) DO NOTHING;
    `, [email]);

    await client.end();
    return NextResponse.json({ message: 'Suscrito con éxito' }, { status: 200 });
  } catch (error) {
    if (client) await client.end().catch(() => {});
    console.error('Error suscribiendo al usuario:', error);
    return NextResponse.json({ error: 'DB Error: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
