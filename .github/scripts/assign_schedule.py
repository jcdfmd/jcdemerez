import os
import glob
import random
import sys
try:
    import frontmatter
except ImportError:
    print("Por favor instala python-frontmatter: pip install python-frontmatter")
    sys.exit(1)

# Generar los 365 días válidos (ignorando 29-02)
dias_del_año = []
meses_dias = {
    1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
    7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31
}

for mes, dias in meses_dias.items():
    for dia in range(1, dias + 1):
        dias_del_año.append(f"{str(dia).zfill(2)}-{str(mes).zfill(2)}")

def main():
    vault_path = "content/vault"
    if not os.path.exists(vault_path):
        print("El directorio de notas no existe.")
        sys.exit(0)

    archivos_brutos = glob.glob(os.path.join(vault_path, "*.md"))
    archivos = []
    for f in archivos_brutos:
        basename = os.path.basename(f)
        if basename.startswith('_'): continue
        if basename.lower() in ['mi calendario.md', 'calendario.md']: continue
        archivos.append(f)
    
    # Mapear las horas ya ocupadas en cada día
    calendario_horas_ocupadas = {dia: [] for dia in dias_del_año}
    archivos_sin_asignar = []

    for archivo in archivos:
        try:
            with open(archivo, "r", encoding="utf-8") as f:
                post = frontmatter.load(f)
            
            # Si ya tiene publish_day y publish_time, solo verificar que tenga type
            if 'publish_day' in post.metadata and 'publish_time' in post.metadata:
                dia_asignado = post.metadata['publish_day']
                hora_asignada = str(post.metadata['publish_time']).split(':')[0].zfill(2)
                if dia_asignado in calendario_horas_ocupadas:
                    calendario_horas_ocupadas[dia_asignado].append(hora_asignada)
                
                # Asegurar que archivos ya programados tengan type
                if 'type' not in post.metadata:
                    post.metadata['type'] = 'aforismo'
                    with open(archivo, "w", encoding="utf-8") as f:
                        f.write(frontmatter.dumps(post))
                    print(f"  [type] Añadido type: aforismo a '{os.path.basename(archivo)}'")
            else:
                archivos_sin_asignar.append(archivo)
        except Exception as e:
            print(f"Error procesando {archivo}: {e}")

    if not archivos_sin_asignar:
        print("Todos los archivos tienen ya programación. No se requiere acción.")
        sys.exit(0)

    print(f"Se han encontrado {len(archivos_sin_asignar)} archivos sin fecha. Asignando motor perpetuo...")

    for archivo in archivos_sin_asignar:
        # Encontrar el nivel de carga más bajo basado en la cantidad de horas ocupadas
        cargas_por_dia = {dia: len(horas) for dia, horas in calendario_horas_ocupadas.items()}
        min_carga = min(cargas_por_dia.values())
        
        if min_carga >= 24:
            print("El calendario de 365 días está completamente saturado a 24 tweets/día. Se ignora.")
            break
            
        # Filtrar todos los días que tengan ese nivel mínimo
        dias_optimos = [dia for dia, carga in cargas_por_dia.items() if carga == min_carga]
        
        from datetime import datetime
        now = datetime.utcnow()
        mes_actual = now.month
        dia_actual = now.day

        def distancia_a_hoy(date_str):
            parts = date_str.split("-")
            dia_obj = int(parts[0])
            mes_obj = int(parts[1])
            
            # Calculo simple de peso en días
            d1 = mes_actual * 30 + dia_actual
            d2 = mes_obj * 30 + dia_obj
            diff = d2 - d1
            # Si el día ya ha pasado este año, medimos la distancia hacia el año que viene
            if diff <= 0:
                diff += 365 
            return diff
            
        # Ordenar días libres para que escoja el más próximo a hoy en el tiempo
        dias_optimos.sort(key=distancia_a_hoy)
        dia_elegido = dias_optimos[0]
        
        # Seleccionar una hora al azar verificando que NO esté ya ocupada en ese día concreto
        horas_libres = [str(h).zfill(2) for h in range(24) if str(h).zfill(2) not in calendario_horas_ocupadas[dia_elegido]]
        hora_elegida = random.choice(horas_libres)
        
        # Actualizar cargas matemáticas para la siguiente iteración
        calendario_horas_ocupadas[dia_elegido].append(hora_elegida)
        
        # Reescribir el archivo de Obsidian inyectando el frontmatter
        with open(archivo, "r", encoding="utf-8") as f:
            post = frontmatter.load(f)
            
        post.metadata['publish_day'] = dia_elegido
        post.metadata['publish_time'] = f"{hora_elegida}:00"

        # Asegurar que tiene tipo asignado (default: aforismo)
        if 'type' not in post.metadata:
            post.metadata['type'] = 'aforismo'
        
        with open(archivo, "w", encoding="utf-8") as f:
            f.write(frontmatter.dumps(post))
            
        print(f"-> Archivo '{os.path.basename(archivo)}' asignado cíclicamente para el {dia_elegido} a las {hora_elegida}:00 h.")

if __name__ == "__main__":
    main()
