#!/bin/bash
# Script rápido para iniciar el servicio (desarrollo/testing)
# Para producción, usa systemd

cd "$(dirname "$0")"

# Activar entorno virtual
if [ ! -d "venv" ]; then
    echo "❌ Entorno virtual no encontrado. Ejecuta setup-plesk.sh primero"
    exit 1
fi

source venv/bin/activate

# Verificar .env
if [ ! -f ".env" ]; then
    echo "❌ Archivo .env no encontrado. Crea uno desde env-example.txt"
    exit 1
fi

# Iniciar servicio
echo "🚀 Iniciando ML Cluster Service..."
python run.py
