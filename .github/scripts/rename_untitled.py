import os
import glob
import sys
import re

try:
    import frontmatter
except ImportError:
    print("Instalando python-frontmatter...")
    os.system("pip install python-frontmatter")
    import frontmatter

def get_new_filename(content_text, num_words=5):
    # Encontrar todas las palabras incluyendo acentos y números
    words = re.findall(r'[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]+', content_text)
    if not words:
        return None
    
    selected_words = words[:num_words]
    
    # Capitalizar la primera letra de la primera palabra, y minúsculas para el resto
    # O mejor, dejar las mayúsculas originales pero asegurar que la primera empieza por mayúscula
    first_word = selected_words[0].capitalize()
    rest_words = selected_words[1:]
    
    final_words = [first_word] + rest_words
    base_name = "_".join(final_words)
    return base_name

def main():
    vault_path = "content/vault"
    if not os.path.exists(vault_path):
        print("El directorio de notas no existe.")
        sys.exit(0)

    # Buscar archivos que empiecen por "Untitled" o "untitled"
    archivos = []
    archivos.extend(glob.glob(os.path.join(vault_path, "Untitled*.md")))
    archivos.extend(glob.glob(os.path.join(vault_path, "untitled*.md")))
    
    # Quitar duplicados por si acaso (aunque Linux/Mac son case-sensitive en glob, es mejor prevenir)
    archivos = list(set(archivos))

    renombrados = 0

    for archivo in archivos:
        basename = os.path.basename(archivo)
        try:
            with open(archivo, "r", encoding="utf-8") as f:
                post = frontmatter.load(f)
            
            content = post.content.strip()
            if not content:
                print(f"  - {basename} está vacío. No se renombra.")
                continue

            new_basename = get_new_filename(content, num_words=5)
            if not new_basename:
                print(f"  - No se encontraron palabras en {basename}. No se renombra.")
                continue

            new_filename = f"{new_basename}.md"
            new_path = os.path.join(vault_path, new_filename)
            
            # Manejar colisiones de nombres
            counter = 1
            while os.path.exists(new_path):
                new_filename = f"{new_basename}_{counter}.md"
                new_path = os.path.join(vault_path, new_filename)
                counter += 1

            # Renombrar archivo
            os.rename(archivo, new_path)
            print(f"  ✓ Renombrado: '{basename}' -> '{new_filename}'")
            renombrados += 1

        except Exception as e:
            print(f"  ✗ Error procesando {basename}: {e}")

    if renombrados == 0:
        print("No había archivos 'Untitled' para renombrar o no contenían texto válido.")
    else:
        print(f"Se renombraron {renombrados} archivos con éxito.")

if __name__ == "__main__":
    main()
