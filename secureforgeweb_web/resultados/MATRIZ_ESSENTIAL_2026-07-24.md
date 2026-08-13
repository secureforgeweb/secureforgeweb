# Matriz Essential v1.0 — 24 itens × 12 alvos (24/07/2026)

Legenda: **C** = conforme · **NA** = não aplicável · **NC** = não conforme (achado no PDF).

## Proveniência

| Classe | Fonte |
|--------|-------|
| **NC** | Extraído dos PDFs em `resultados/` (plano de ação) — **autoritativo** |
| **C** / **NA** | Reconstrução pelos autores (2026-08-13) nos itens *não* listados como achado. NA preferencial quando pouco observável em caixa-preta (`AUTH-02`, `SECRET-*`, `SURF-02`, `DATA-02` + exceções). SecureForge (white-box): pass = **C** |

Fórmula: `(C + NA) / 24`. Validado: `C+NA+NC=24` e score = tabela do README.

## Resumo por alvo

| Alvo | Score | C | NA | NC | PDF |
|------|------:|--:|---:|---:|-----|
| VAmPI | 25% | 3 | 3 | 18 | `secureforgeweb-vampi-2026-07-24.pdf` |
| OWASP WebGoat (Java) | 29% | 1 | 6 | 17 | `secureforgeweb-owasp-webgoatjava-2026-07-24.pdf` |
| OWASP NodeGoat | 33% | 3 | 5 | 16 | `secureforgeweb-owasp-nodegoat-2026-07-24.pdf` |
| OWASP WebGoat (PHP) | 33% | 3 | 5 | 16 | `secureforgeweb-owasp-webgoatphp-2026-07-24.pdf` |
| DVWA | 38% | 3 | 6 | 15 | `secureforgeweb-dvwa-2026-07-24.pdf` |
| OWASP Mutillidae II | 38% | 4 | 5 | 15 | `secureforgeweb-owasp-mutillidae-ii-2026-07-24.pdf` |
| Ghost CMS | 42% | 4 | 6 | 14 | `secureforgeweb-ghost-cms-2026-07-24.pdf` |
| Gitea | 42% | 2 | 8 | 14 | `secureforgeweb-gitea-2026-07-24.pdf` |
| OWASP Juice Shop | 46% | 3 | 8 | 13 | `secureforgeweb-owasp-juice-shop-2026-07-24.pdf` |
| Mattermost | 58% | 6 | 8 | 10 | `secureforgeweb-mattermost-2026-07-24.pdf` |
| SecureForge Web | 63% | 15 | 0 | 9 | `secureforgeweb-secureforge-web-2026-07-24.pdf` |
| SecureForge Web v2 | 75% | 18 | 0 | 6 | `secureforgeweb-secureforge-web-v2-2026-07-24.pdf` |

## Matriz completa

| Item | VAmPI | WG-J | NodeG | WG-P | DVWA | Mutill | Ghost | Gitea | Juice | Matter | SF | SF-v2 |
|------|------|------|------|------|------|------|------|------|------|------|------|------|
| `AUTH-01` | NC | NC | NC | NC | NC | NC | NC | NC | NC | NC | C | C |
| `AUTH-02` | NC | NC | NA | NC | NC | NC | NC | NA | NC | NC | C | C |
| `AUTH-03` | NC | NC | NC | NA | NA | NC | NA | NC | NA | NA | C | C |
| `AUTH-04` | C | NA | NA | NC | NA | NA | NC | NC | NC | NA | C | C |
| `AUTHZ-01` | C | NA | NC | NA | NA | NA | NC | NA | NA | NA | C | C |
| `AUTHZ-02` | NC | NC | NC | NC | NC | NC | NC | NC | NC | NC | C | C |
| `AUTHZ-03` | C | NC | NC | NC | C | NA | NC | NC | NC | NC | C | C |
| `INPUT-01` | NC | NC | NC | NC | NC | C | NA | NC | NA | NC | C | C |
| `INPUT-02` | NC | NC | NC | C | C | NC | NC | NC | NA | NC | C | C |
| `INPUT-03` | NC | NC | C | NC | NC | C | NC | NC | NC | NC | C | C |
| `SECRET-01` | NC | NA | NA | NC | NC | NC | NA | NA | NA | NA | C | C |
| `SECRET-02` | NA | NC | NC | NC | NC | NC | NA | NC | NC | NA | C | C |
| `HEADER-01` | NC | NC | NC | NC | NC | NC | NC | NC | NC | C | NC | NC |
| `HEADER-02` | NC | NC | NC | NC | NC | NC | NC | NC | NC | C | NC | NC |
| `HEADER-03` | NC | NC | NC | NC | NC | NC | NC | C | NC | C | NC | NC |
| `HEADER-04` | NC | NC | NC | NC | NC | NC | NC | C | NC | C | NC | NC |
| `EXPOS-01` | NC | NA | NA | NA | NA | NA | NC | NA | NA | NC | NC | C |
| `EXPOS-02` | NC | NA | NA | NC | NA | NC | NA | NA | NA | NC | C | C |
| `ERROR-01` | NC | NC | C | C | NC | C | C | NC | C | C | C | C |
| `ERROR-02` | NA | C | NC | C | C | C | C | NC | C | NC | C | C |
| `DATA-01` | NC | NC | NC | NC | NC | NC | C | NA | NC | C | NC | NC |
| `DATA-02` | NC | NC | NC | NA | NC | NC | NA | NA | NC | NA | NC | C |
| `SURF-01` | NC | NC | C | NC | NC | NC | C | NC | C | NA | NC | C |
| `SURF-02` | NA | NA | NC | NA | NA | NA | NC | NA | NA | NA | NC | NC |

Ficheiro CSV: [`matriz-essential-2026-07-24.csv`](matriz-essential-2026-07-24.csv)

## SecureForge: delta baseline → v2

| Item | Baseline | v2 |
|------|----------|-----|
| `EXPOS-01` | NC | **C** |
| `DATA-02` | NC | **C** |
| `SURF-01` | NC | **C** |

Itens que saíram de NC: `EXPOS-01`, `DATA-02`, `SURF-01`.

