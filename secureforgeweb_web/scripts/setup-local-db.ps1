# SecureForge Web — Setup do PostgreSQL no Windows
# Uso (a partir de secureforgeweb_web/): .\scripts\setup-local-db.ps1
#
# Caminho oficial da playlist (vídeo 04): PostgreSQL EDB local + init-postgres.sql
# Alternativa opcional: Docker Compose (mesmo user/senha/base do .env.example)
#
# Nomes canônicos (alinhar com .env.example e docker-compose.yml):
#   user     = secureforgeweb_user
#   password = secureforgeweb_pass
#   database = secureforgeweb
# NÃO use secureforge_dev — esse nome divergiria do README / .env.example.

Write-Host "=== SecureForge Web — Setup PostgreSQL ===" -ForegroundColor Cyan
Write-Host "1) Confirme DATABASE_URL no .env (base final = secureforgeweb, salvo se alterou de propósito)" -ForegroundColor White
Write-Host "2) Se user/senha/base != .env.example, edite scripts/init-postgres.sql para coincidir" -ForegroundColor White
Write-Host ""

$psql = Get-Command psql -ErrorAction SilentlyContinue
if ($psql) {
    Write-Host "Caminho da playlist: executando init-postgres.sql via psql..." -ForegroundColor Yellow
    & psql -U postgres -f scripts/init-postgres.sql
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Script aplicado. Execute: pnpm db:setup" -ForegroundColor Green
        exit 0
    }
    Write-Host "[ERRO] Falha ao executar psql. Verifique a senha do usuario postgres." -ForegroundColor Red
    exit 1
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "psql nao esta no PATH. Alternativa: Docker Compose..." -ForegroundColor Yellow
    docker compose up -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Container secureforgeweb-postgres iniciado" -ForegroundColor Green
        Write-Host "Aguarde alguns segundos e execute: pnpm db:setup" -ForegroundColor Cyan
        exit 0
    }
    Write-Host "[ERRO] Falha ao iniciar Docker Compose" -ForegroundColor Red
    exit 1
}

Write-Host "Nem psql nem docker encontrados." -ForegroundColor Yellow
Write-Host "Instale PostgreSQL EDB (playlist) e use o caminho completo, por exemplo:" -ForegroundColor White
Write-Host '  & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -f scripts/init-postgres.sql' -ForegroundColor White
exit 1
