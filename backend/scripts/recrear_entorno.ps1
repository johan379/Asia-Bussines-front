param(
    [switch]$SinMigrar
)

$ErrorActionPreference = "Stop"
$raizBackend = Split-Path -Parent $PSScriptRoot
Set-Location $raizBackend

$pythonSistema = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonSistema) {
    throw "No se encontró Python. Instala Python 3.12 o 3.13 y marca 'Add Python to PATH'; luego vuelve a ejecutar este script."
}

$versionPython = & $pythonSistema.Source -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ($LASTEXITCODE -ne 0 -or $versionPython -notin @("3.12", "3.13")) {
    throw "Este backend requiere Python 3.12 o 3.13. El comando python actual usa $versionPython. Instala/activa una versión compatible y vuelve a ejecutar."
}

# Se conserva el entorno roto como respaldo en lugar de borrarlo. Si Windows
# lo tiene bloqueado por un proceso anterior, se crea un entorno alterno y el
# usuario puede continuar sin perder tiempo ni datos.
$entornoDestino = ".venv"
if (Test-Path ".venv") {
    $respaldo = ".venv_roto_" + (Get-Date -Format "yyyyMMddHHmmss")
    try {
        Rename-Item -LiteralPath ".venv" -NewName $respaldo -ErrorAction Stop
        Write-Host "Entorno anterior conservado como $respaldo"
    } catch {
        $entornoDestino = ".venv_reparado_" + (Get-Date -Format "yyyyMMddHHmmss")
        Write-Warning "No se pudo mover .venv porque está en uso. Se creará $entornoDestino."
    }
}

if (Test-Path $entornoDestino) {
    throw "Ya existe $entornoDestino. Ciérralo o elimínalo solo si sabes que no está en uso."
}

& $pythonSistema.Source -m venv $entornoDestino
$pythonEntorno = ".\\$entornoDestino\\Scripts\\python.exe"
& $pythonEntorno -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw "No se pudo actualizar pip." }
& $pythonEntorno -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "No se pudieron instalar las dependencias." }

if (-not $SinMigrar) {
    & ".\\$entornoDestino\\Scripts\\alembic.exe" upgrade head
    if ($LASTEXITCODE -ne 0) { throw "No se pudieron aplicar las migraciones." }
}

Write-Host "Listo. Inicia el backend con: & $pythonEntorno -m uvicorn app.main:app --reload"
