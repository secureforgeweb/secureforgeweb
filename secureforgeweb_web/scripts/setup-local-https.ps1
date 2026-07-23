# Gera certificados locais confiáveis (mkcert) para demo HTTPS em localhost.
# Uso (PowerShell; na 1ª vez o mkcert -install pode pedir UAC/Admin):
#   cd secureforgeweb_web
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup-local-https.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$certs = Join-Path $root "certs"
New-Item -ItemType Directory -Force -Path $certs | Out-Null

function Refresh-Path {
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Find-Mkcert {
  Refresh-Path
  $cmd = Get-Command mkcert -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $wingetPkg = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "mkcert.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
  if ($wingetPkg) { return $wingetPkg }

  $links = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links\mkcert.exe"
  if (Test-Path $links) { return $links }

  return $null
}

$mkcert = Find-Mkcert
if (-not $mkcert) {
  Write-Host "mkcert nao encontrado neste shell. Feche e abra o terminal, ou instale:" -ForegroundColor Yellow
  Write-Host "  winget install FiloSottile.mkcert"
  Write-Host "Depois rode de novo: pnpm https:setup"
  exit 1
}

Write-Host "Usando mkcert: $mkcert" -ForegroundColor Cyan
Write-Host "Instalando CA local do mkcert (pode pedir UAC)..." -ForegroundColor Cyan
& $mkcert -install
if ($LASTEXITCODE -ne 0) {
  Write-Host "Falha no mkcert -install. Abra o PowerShell como Administrador e rode de novo." -ForegroundColor Red
  exit $LASTEXITCODE
}

Push-Location $certs
try {
  Remove-Item ".\localhost.pem", ".\localhost-key.pem" -Force -ErrorAction SilentlyContinue
  & $mkcert -cert-file localhost.pem -key-file localhost-key.pem localhost 127.0.0.1 ::1
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Certificados gerados em: $certs" -ForegroundColor Green
  Write-Host "  localhost.pem"
  Write-Host "  localhost-key.pem"
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "1) No .env (raiz ou secureforgeweb_web), adicione:"
Write-Host @"
VITE_DEV_HTTPS=1
HTTPS_CERT=certs/localhost.pem
HTTPS_KEY=certs/localhost-key.pem
FRONTEND_URL=https://localhost:5173
VITE_OAUTH_PORTAL_URL=https://localhost:5173/login
VITE_API_PROXY_TARGET=https://localhost:3000
ENABLE_SECURE_HEADERS=1
COOKIE_SECURE=1
ADDITIONAL_ORIGINS=https://localhost:5173,https://localhost:3000
"@
Write-Host "2) Reinicie: pnpm dev"
Write-Host "3) Abra https://localhost:5173"
Write-Host "4) Para validar headers (CSP/HSTS) no checklist, cadastre a app com URL:"
Write-Host "   https://localhost:3000"
