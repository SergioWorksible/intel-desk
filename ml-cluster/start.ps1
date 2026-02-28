# Script PowerShell para iniciar el servicio ML Cluster
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ML Cluster Service - Geopolitic" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si existe el entorno virtual
if (-not (Test-Path "venv\Scripts\activate.ps1")) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host ""
}

# Activar entorno virtual
Write-Host "Activando entorno virtual..." -ForegroundColor Green
& "venv\Scripts\activate.ps1"

# Verificar si las dependencias están instaladas
try {
    python -c "import flask" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Flask no encontrado"
    }
} catch {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    pip install -r requirements.txt
    Write-Host ""
}

# Iniciar el servicio
Write-Host "Iniciando servicio..." -ForegroundColor Green
python run.py
