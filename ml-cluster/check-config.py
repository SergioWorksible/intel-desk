#!/usr/bin/env python3
"""
Script para verificar la configuración del servicio ML Cluster
"""
import sys
import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 60)
print("Verificación de Configuración - ML Cluster Service")
print("=" * 60)
print()

errors = []
warnings = []

# Verificar SUPABASE_URL
supabase_url = os.getenv("SUPABASE_URL")
if not supabase_url:
    errors.append("❌ SUPABASE_URL no configurada")
else:
    print(f"✓ SUPABASE_URL: {supabase_url[:40]}...")

# Verificar SUPABASE_SERVICE_KEY
supabase_secret = os.getenv("SUPABASE_SECRET_KEY")
supabase_service_role = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase_service = os.getenv("SUPABASE_SERVICE_KEY")

service_key = supabase_secret or supabase_service_role or supabase_service

if not service_key:
    errors.append("❌ Falta la clave de servicio de Supabase")
    print("\nConfigura una de estas variables:")
    print("  - SUPABASE_SECRET_KEY (nueva, recomendada)")
    print("  - SUPABASE_SERVICE_ROLE_KEY (legacy)")
    print("  - SUPABASE_SERVICE_KEY (fallback)")
    print("\nObtén la clave de: Supabase Dashboard > Settings > API > Service Role Key")
else:
    key_type = "SUPABASE_SECRET_KEY (nueva)" if supabase_secret else \
               "SUPABASE_SERVICE_ROLE_KEY (legacy)" if supabase_service_role else \
               "SUPABASE_SERVICE_KEY (fallback)"
    print(f"✓ Clave de servicio configurada: {key_type}")
    
    # Verificar formato
    if supabase_secret and not supabase_secret.startswith("sb_secret_"):
        warnings.append("⚠️ SUPABASE_SECRET_KEY debería empezar con 'sb_secret_'")
    elif supabase_service_role and not supabase_secret:
        warnings.append("⚠️ Considera migrar a SUPABASE_SECRET_KEY (nueva API)")

# Verificar DATABASE_URL
database_url = os.getenv("DATABASE_URL")
if not database_url:
    warnings.append("⚠️ DATABASE_URL no configurada - pgvector no estará disponible")
    print("⚠️ DATABASE_URL no configurada")
    print("   Las operaciones de pgvector no estarán disponibles")
    print("   Obtén la connection string de: Supabase Dashboard > Connect > Session pooler")
else:
    print(f"✓ DATABASE_URL configurada")
    
    # Verificar tipo de conexión
    if ":6543" in database_url:
        warnings.append("⚠️ Transaction Mode (puerto 6543) detectado - no recomendado para pgvector")
        print("   ⚠️ Usando Transaction Mode (puerto 6543)")
        print("   Recomendado: Usa Session Pooler (puerto 5432) para pgvector")
    elif "pooler.supabase.com" in database_url:
        print("   ✓ Usando Session Pooler (recomendado para pgvector)")
    elif "db." in database_url and ".supabase.co:5432" in database_url:
        print("   ✓ Usando Direct Connection (requiere IPv6)")

# Verificar otras configuraciones
port = os.getenv("PORT", "5001")
print(f"✓ PORT: {port}")

embedding_model = os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
print(f"✓ EMBEDDING_MODEL: {embedding_model}")

print()

# Mostrar errores
if errors:
    print("=" * 60)
    print("ERRORES:")
    print("=" * 60)
    for error in errors:
        print(error)
    print()
    sys.exit(1)

# Mostrar advertencias
if warnings:
    print("=" * 60)
    print("ADVERTENCIAS:")
    print("=" * 60)
    for warning in warnings:
        print(warning)
    print()

# Verificar conexión a Supabase
if service_key and supabase_url:
    print("=" * 60)
    print("Probando conexión a Supabase...")
    print("=" * 60)
    try:
        from supabase import create_client
        supabase = create_client(supabase_url, service_key)
        
        # Probar una query simple
        response = supabase.table("clusters").select("id").limit(1).execute()
        print("✓ Conexión a Supabase exitosa")
    except Exception as e:
        errors.append(f"❌ Error conectando a Supabase: {e}")
        print(f"❌ Error: {e}")
        print("\nVerifica:")
        print("  1. Que SUPABASE_URL sea correcta")
        print("  2. Que la clave de servicio sea válida")
        print("  3. Que tu proyecto Supabase esté activo")

# Verificar conexión a PostgreSQL (si está configurada)
if database_url:
    print()
    print("=" * 60)
    print("Probando conexión a PostgreSQL...")
    print("=" * 60)
    try:
        import psycopg2
        conn = psycopg2.connect(database_url, connect_timeout=5)
        cur = conn.cursor()
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print(f"✓ Conexión a PostgreSQL exitosa")
        print(f"  Versión: {version.split(',')[0]}")
        
        # Verificar extensión pgvector
        cur.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
        if cur.fetchone():
            print("✓ Extensión pgvector instalada")
        else:
            warnings.append("⚠️ Extensión pgvector no encontrada")
            print("⚠️ Extensión pgvector no encontrada")
            print("   Ejecuta: CREATE EXTENSION IF NOT EXISTS vector;")
        
        cur.close()
        conn.close()
    except Exception as e:
        warnings.append(f"⚠️ No se pudo conectar a PostgreSQL: {e}")
        print(f"⚠️ Error: {e}")
        print("\nVerifica:")
        print("  1. Que DATABASE_URL sea correcta")
        print("  2. Que uses Session Pooler (puerto 5432) o Direct Connection")
        print("  3. Que tu red permita conexiones salientes")

print()
print("=" * 60)
if errors:
    print("❌ Configuración incompleta - corrige los errores arriba")
    sys.exit(1)
elif warnings:
    print("⚠️ Configuración básica OK, pero hay advertencias")
    print("   El servicio funcionará, pero algunas características pueden no estar disponibles")
else:
    print("✓ Configuración completa - todo listo!")
print("=" * 60)
