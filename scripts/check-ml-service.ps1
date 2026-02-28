# Script para verificar que el servicio ML Cluster esté corriendo
# Uso: .\scripts\check-ml-service.ps1

$ML_CLUSTER_URL = $env:ML_CLUSTER_URL
if (-not $ML_CLUSTER_URL) {
    $ML_CLUSTER_URL = "http://localhost:5001"
}

Write-Host "🔍 Verificando servicio ML Cluster..." -ForegroundColor Cyan
Write-Host "   URL: $ML_CLUSTER_URL" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$ML_CLUSTER_URL/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Servicio ML Cluster está corriendo correctamente" -ForegroundColor Green
        $body = $response.Content | ConvertFrom-Json
        Write-Host "   Status: $($body.status)" -ForegroundColor Gray
        Write-Host "   Timestamp: $($body.timestamp)" -ForegroundColor Gray
        exit 0
    } else {
        Write-Host "❌ Servicio respondió con código: $($response.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ No se pudo conectar al servicio ML Cluster" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Para iniciar el servicio:" -ForegroundColor Cyan
    Write-Host "   1. Abre una terminal en la carpeta ml-cluster" -ForegroundColor White
    Write-Host "   2. Activa el entorno virtual:" -ForegroundColor White
    Write-Host "      .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
    Write-Host "   3. Ejecuta el servicio:" -ForegroundColor White
    Write-Host "      python run.py" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   O usa el script de inicio:" -ForegroundColor White
    Write-Host "      .\ml-cluster\start.ps1" -ForegroundColor Gray
    exit 1
}
