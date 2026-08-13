# SecureForge Web — Setup do PostgreSQL no Windows (caminho da playlist: EDB local)
# Uso: .\scripts\setup-local-db.ps1

Write-Host "=== SecureForge Web — Setup PostgreSQL (EDB local) ===" -ForegroundColor Cyan
Write-Host "1) Confirme DATABASE_URL no .env" -ForegroundColor White
Write-Host "2) Se user/senha/base != .env.example, edite scripts/init-postgres.sql para coincidir" -ForegroundColor White
Write-Host "3) psql -U postgres -f scripts/init-postgres.sql" -ForegroundColor Yellow
Write-Host "4) Depois: pnpm db:setup" -ForegroundColor Cyan
Write-Host "Alternativa opcional (nao usada no video 04): docker compose up -d" -ForegroundColor DarkGray
Write-Host ""

$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    Write-Host "Executando init-postgres.sql..." -ForegroundColor Yellow
    & psql -U postgres -f scripts/init-postgres.sql
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Script aplicado. Execute: pnpm db:setup" -ForegroundColor Green
    } else {
        Write-Host "[ERRO] Falha ao executar psql. Verifique a senha do usuario postgres." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "psql nao esta no PATH. Use o caminho completo, ex.:" -ForegroundColor Yellow
    Write-Host '  & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -f scripts/init-postgres.sql' -ForegroundColor White
}
