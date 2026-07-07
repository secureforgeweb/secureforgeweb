# SecureForge Web — Setup do PostgreSQL no Windows
# Uso: .\scripts\setup-local-db.ps1

Write-Host "=== SecureForge Web — Setup PostgreSQL ===" -ForegroundColor Cyan

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Iniciando container Docker..." -ForegroundColor Yellow
    docker compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Container secureforgeweb-postgres iniciado" -ForegroundColor Green
        Write-Host "Aguarde alguns segundos e execute: pnpm db:setup" -ForegroundColor Cyan
    } else {
        Write-Host "[ERRO] Falha ao iniciar Docker Compose" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Docker não encontrado. Use PostgreSQL local e execute:" -ForegroundColor Yellow
    Write-Host "  psql -U postgres -f scripts/init-postgres.sql" -ForegroundColor White
}
