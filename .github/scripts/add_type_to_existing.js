#!/usr/bin/env node
/**
 * Añade type: aforismo a todos los archivos del vault que no tengan el campo type.
 * No requiere dependencias externas — usa solo el fs nativo de Node.js.
 */

const fs = require('fs');
const path = require('path');

const vaultPath = path.join(__dirname, '../../content/vault');

if (!fs.existsSync(vaultPath)) {
  console.error('❌ No se encontró content/vault');
  process.exit(1);
}

const SKIP = ['_mi calendario.md', 'calendario.md'];

const files = fs.readdirSync(vaultPath).filter(f => {
  if (!f.endsWith('.md')) return false;
  if (f.startsWith('_')) return false;
  if (SKIP.includes(f.toLowerCase())) return false;
  return true;
});

let updated = 0;
let skipped = 0;

for (const file of files) {
  const filePath = path.join(vaultPath, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Comprobar si ya tiene frontmatter
  const hasFrontmatter = content.startsWith('---');
  
  if (!hasFrontmatter) {
    // Sin frontmatter: añadir uno nuevo con type
    content = `---\ntype: aforismo\n---\n\n${content.trimStart()}`;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ [nuevo FM] ${file}`);
    updated++;
    continue;
  }

  // Con frontmatter: comprobar si ya tiene type
  const fmEnd = content.indexOf('\n---', 3);
  if (fmEnd === -1) { skipped++; continue; }

  const fmBlock = content.slice(0, fmEnd + 4);
  
  if (/^type:/m.test(fmBlock)) {
    skipped++;
    continue; // Ya tiene type, no tocar
  }

  // Insertar type justo después de la primera línea ---
  const firstLineEnd = content.indexOf('\n');
  const before = content.slice(0, firstLineEnd + 1);
  const after = content.slice(firstLineEnd + 1);
  content = `${before}type: aforismo\n${after}`;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ ${file}`);
  updated++;
}

console.log(`\n✅ Resultado: ${updated} archivos actualizados, ${skipped} ya tenían type.`);
