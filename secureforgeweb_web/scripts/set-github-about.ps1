# Aplica description, homepage e topics no GitHub.
# Uso (no PowerShell):
#   $env:GITHUB_TOKEN = "seu_token"
#   .\scripts\set-github-about.ps1
#
# Obs.: no Windows PowerShell 5, ConvertTo-Json + em-dash (—) quebra o JSON da API.
# Este script envia UTF-8 com hifen ASCII.

$ErrorActionPreference = "Stop"
if (-not $env:GITHUB_TOKEN) {
  Write-Error 'Defina $env:GITHUB_TOKEN antes de executar.'
}

$headers = @{
  Authorization            = "Bearer $env:GITHUB_TOKEN"
  Accept                   = "application/vnd.github+json"
  "X-GitHub-Api-Version"   = "2022-11-28"
}

$repoJson = @"
{"description":"SecureForge Web - diagnostico de postura OWASP e hardening guiado (SBSeg 2026, Codigo Aberto)","homepage":"https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link"}
"@
$repoBytes = [System.Text.Encoding]::UTF8.GetBytes($repoJson)

$repo = Invoke-RestMethod `
  -Method Patch `
  -Uri "https://api.github.com/repos/secureforgeweb/secureforgeweb" `
  -Headers $headers `
  -ContentType "application/json; charset=utf-8" `
  -Body $repoBytes

Write-Host "OK description: $($repo.description)"
Write-Host "OK homepage:    $($repo.homepage)"

$topicsJson = '{"names":["owasp","security","typescript","react","nodejs","sbseg","web-security","postgresql"]}'
$topicsBytes = [System.Text.Encoding]::UTF8.GetBytes($topicsJson)

$topics = Invoke-RestMethod `
  -Method Put `
  -Uri "https://api.github.com/repos/secureforgeweb/secureforgeweb/topics" `
  -Headers $headers `
  -ContentType "application/json; charset=utf-8" `
  -Body $topicsBytes

Write-Host ("OK topics:      " + ($topics.names -join ", "))
