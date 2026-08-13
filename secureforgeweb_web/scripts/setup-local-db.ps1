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
    Write-Host "Docker não encontrado. Use PostgreSQL local:" -ForegroundColor Yellow
    Write-Host "  1) Confirme DATABASE_URL no .env" -ForegroundColor White
    Write-Host "  2) Se user/senha/base != .env.example, edite scripts/init-postgres.sql para coincidir" -ForegroundColor White
    Write-Host "  3) psql -U postgres -f scripts/init-postgres.sql" -ForegroundColor White
}
