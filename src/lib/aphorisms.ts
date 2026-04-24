import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface Aphorism {
  id: string; // Base64 del nombre del archivo, para identificar sin repetirse
  content: string;
}

export interface VaultData {
  todayAphorisms: Aphorism[];
  otherAphorisms: Aphorism[];
  allAphorisms: Aphorism[];
  lastUpdate: string;
  todayCount: number;
}

export function formatSpanishDate(date: Date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

export function getAphorisms(): VaultData {
  const todayAphorisms: Aphorism[] = [];
  const otherAphorisms: Aphorism[] = [];
  let lastUpdate = "Desconocida";
  let latestMtimeMs = 0;
  
  try {
    const vaultPath = path.join(process.cwd(), 'content', 'vault');
    let useFsStat = true;

    // 1. Intentar usar la fecha compilada globalmente a fuego en Vercel
    if (process.env.VAULT_LAST_UPDATE_MS) {
      latestMtimeMs = parseInt(process.env.VAULT_LAST_UPDATE_MS);
      useFsStat = false;
    } else {
      // 2. Si estamos en local (dev mode), calcular dinámicamente con git
      try {
        const gitDateOutput = execSync('git log -1 --format=%ct -- content/vault', { stdio: 'pipe' }).toString().trim();
        if (gitDateOutput) {
          latestMtimeMs = parseInt(gitDateOutput) * 1000;
          useFsStat = false;
        }
      } catch {
        // Ignorar si falla, fallback a FS
      }
    }
    
    if (fs.existsSync(vaultPath)) {
      const files = fs.readdirSync(vaultPath);
      
      files.forEach(file => {
        if (file.endsWith('.md')) {
          if (file.startsWith('_') || file.toLowerCase() === 'mi calendario.md' || file.toLowerCase() === 'calendario.md') {
            return;
          }
          
          const filePath = path.join(vaultPath, file);
          const fileContents = fs.readFileSync(filePath, 'utf8');
          
          const stats = fs.statSync(filePath);
          
          let isToday = false;
          
          // Solo priorizar creados/modificados hoy en entorno local (development)
          if (process.env.NODE_ENV === 'development') {
            const isDateToday = (timestamp: number) => {
              if (!timestamp) return false;
              const date = new Date(timestamp);
              const now = new Date();
              return date.getDate() === now.getDate() &&
                     date.getMonth() === now.getMonth() &&
                     date.getFullYear() === now.getFullYear();
            };

            let hasYamlDate = false;
            // 1. Prioridad Absoluta: Etiqueta YAML 'updated' o 'modified' del plugin de Obsidian
            const yamlMatch = fileContents.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            if (yamlMatch && yamlMatch[1]) {
              const updatedMatch = yamlMatch[1].match(/^(?:updated|modified):\s*"?([^"\s\r\n]+)"?/im);
              if (updatedMatch && updatedMatch[1]) {
                hasYamlDate = true;
                const timestamp = new Date(updatedMatch[1]).getTime();
                if (!isNaN(timestamp) && isDateToday(timestamp)) {
                  isToday = true;
                }
              }
            }

            // 2. Fallback: Si no tiene la etiqueta YAML, miramos el reloj del disco duro
            if (!hasYamlDate) {
              const fileTime = stats.birthtime?.getTime() || stats.ctimeMs || stats.mtimeMs;
              if (isDateToday(fileTime) || isDateToday(stats.mtimeMs)) {
                isToday = true;
              }
            }
          }

          // Analizar fecha de modificación general (para última actualización)
          if (useFsStat && stats.mtimeMs > latestMtimeMs) {
            latestMtimeMs = stats.mtimeMs;
          }

          const content = fileContents.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trim();
          if (content.length > 0) {
            const id = Buffer.from(file).toString('base64');
            const item = { id, content };
            if (isToday) {
              todayAphorisms.push(item);
            } else {
              otherAphorisms.push(item);
            }
          }
        }
      });
    }

    if (latestMtimeMs > 0) {
      lastUpdate = formatSpanishDate(new Date(latestMtimeMs));
    }
    
    const allAphorisms = [...todayAphorisms, ...otherAphorisms];
    
    return {
      todayAphorisms,
      otherAphorisms,
      allAphorisms,
      lastUpdate,
      todayCount: todayAphorisms.length
    };
  } catch (error) {
    console.error("Error leyendo vault:", error);
    return {
      todayAphorisms: [],
      otherAphorisms: [],
      allAphorisms: [],
      lastUpdate: "Desconocida",
      todayCount: 0
    };
  }
}
