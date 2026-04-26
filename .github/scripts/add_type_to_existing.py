"""
Script para añadir type: aforismo a todos los archivos existentes del vault
que no tengan el campo type definido.
"""
import os
import glob
import sys
try:
    import frontmatter
except ImportError:
    print("Instalando python-frontmatter...")
    os.system("pip install python-frontmatter")
    import frontmatter

def main():
    vault_path = "content/vault"
    if not os.path.exists(vault_path):
        print("El directorio de notas no existe.")
        sys.exit(1)

    archivos = glob.glob(os.path.join(vault_path, "*.md"))
    updated = 0
    skipped = 0

    for archivo in archivos:
        basename = os.path.basename(archivo)
        # Ignorar archivos especiales
        if basename.startswith('_'):
            continue
        if basename.lower() in ['mi calendario.md', 'calendario.md']:
            continue

        try:
            with open(archivo, "r", encoding="utf-8") as f:
                post = frontmatter.load(f)

            if 'type' not in post.metadata:
                post.metadata['type'] = 'aforismo'
                with open(archivo, "w", encoding="utf-8") as f:
                    f.write(frontmatter.dumps(post))
                updated += 1
                print(f"  ✓ {basename}")
            else:
                skipped += 1
        except Exception as e:
            print(f"  ✗ Error en {basename}: {e}")

    print(f"\nResultado: {updated} archivos actualizados, {skipped} ya tenían type.")

if __name__ == "__main__":
    main()
