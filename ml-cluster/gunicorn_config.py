"""
Configuración de Gunicorn para producción
"""
import multiprocessing
import os
from pathlib import Path

# Directorio base
BASE_DIR = Path(__file__).parent

# Número de workers (ajusta según CPU del servidor)
# Para servidores pequeños: 2-4 workers
# Para servidores grandes: CPU cores * 2 + 1
workers = min(multiprocessing.cpu_count() * 2 + 1, 8)  # Máximo 8 workers
worker_class = "sync"
bind = "127.0.0.1:5001"  # Solo escuchar en localhost (usar nginx como proxy)
timeout = 300  # 5 minutos (para procesamiento ML que puede tardar)
keepalive = 5
max_requests = 1000  # Reiniciar worker después de N requests (previene memory leaks)
max_requests_jitter = 50
preload_app = True  # Cargar app antes de fork (ahorra memoria)

# Logging
log_dir = BASE_DIR / "logs"
log_dir.mkdir(exist_ok=True)

accesslog = str(log_dir / "gunicorn-access.log")
errorlog = str(log_dir / "gunicorn-error.log")
loglevel = "info"

# PID file
pidfile = str(log_dir / "gunicorn.pid")

# Worker timeout para operaciones ML largas
graceful_timeout = 30

# Environment variables (se cargan desde .env)
# Nota: Gunicorn no carga .env automáticamente, usa systemd EnvironmentFile

def when_ready(server):
    """Callback cuando el servidor está listo"""
    server.log.info("ML Cluster Service iniciado con Gunicorn")
    server.log.info(f"Workers: {workers}")
    server.log.info(f"Bind: {bind}")

def on_exit(server):
    """Callback cuando el servidor se detiene"""
    server.log.info("ML Cluster Service detenido")
