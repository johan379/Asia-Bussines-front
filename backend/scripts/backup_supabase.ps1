param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl,
    [string]$OutputDirectory = ".\backups",
    [ValidateRange(1, 3650)]
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    throw "No se encontró pg_dump. Instala las herramientas de PostgreSQL y vuelve a ejecutar."
}

$carpeta = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $carpeta | Out-Null
$marcaTiempo = Get-Date -Format "yyyyMMdd-HHmmss"
$archivo = Join-Path $carpeta "inventario-$marcaTiempo.dump"

# El formato custom permite restaurar selectivamente con pg_restore.
& pg_dump --format=custom --no-owner --file $archivo $DatabaseUrl
if ($LASTEXITCODE -ne 0) { throw "pg_dump no pudo crear el respaldo." }

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivo).Hash
Set-Content -LiteralPath "$archivo.sha256" -Value "$hash  $([System.IO.Path]::GetFileName($archivo))"

# Conserva un historial acotado. Elimina solo dumps creados por este script.
$limite = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -LiteralPath $carpeta -Filter "inventario-*.dump" -File |
    Where-Object { $_.LastWriteTime -lt $limite } |
    ForEach-Object {
        Remove-Item -LiteralPath $_.FullName
        Remove-Item -LiteralPath "$($_.FullName).sha256" -ErrorAction SilentlyContinue
    }

Write-Host "Respaldo creado: $archivo"
