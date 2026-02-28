@echo off
echo ========================================
echo ML Cluster Service - Geopolitic
echo ========================================
echo.

REM Verificar si existe el entorno virtual
if not exist "venv\Scripts\activate.bat" (
    echo Creando entorno virtual...
    python -m venv venv
    echo.
)

REM Activar entorno virtual
REM En PowerShell usar: .\venv\Scripts\Activate.ps1
call venv\Scripts\activate.bat

REM Verificar si las dependencias están instaladas
python -c "import flask" 2>nul
if errorlevel 1 (
    echo Instalando dependencias...
    pip install -r requirements.txt
    echo.
)

REM Iniciar el servicio
echo Iniciando servicio...
python run.py
