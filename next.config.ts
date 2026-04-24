import type { NextConfig } from "next";
import { execSync } from 'child_process';

// En Vercel, el entorno Serverless elimina la carpeta .git y marca todos los archivos con fecha 2018-10-20.
// Para solucionarlo, extraemos la fecha de git DURANTE el entorno de compilación (que sí tiene .git) 
// y se la pasamos en duro al servidor.
let vaultUpdateMs = Date.now().toString();
try {
  const output = execSync('git log -1 --format=%ct -- content/vault', { stdio: 'pipe' }).toString().trim();
  if (output) {
    vaultUpdateMs = (parseInt(output) * 1000).toString();
  } else {
    const fallback = execSync('git log -1 --format=%ct', { stdio: 'pipe' }).toString().trim();
    if (fallback) vaultUpdateMs = (parseInt(fallback) * 1000).toString();
  }
} catch (e) {}

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/*': ['./content/vault/**/*'],
    '/api/**/*': ['./content/vault/**/*'],
  },
  env: {
    VAULT_LAST_UPDATE_MS: vaultUpdateMs
  },
  // Burlar AdBlockers encubriendo las peticiones de PostHog como peticiones nativas propias
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://eu.i.posthog.com/decide",
      },
    ];
  },
};

export default nextConfig;
