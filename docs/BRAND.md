# SecureForge Web — Identidade visual

**Repositório:** https://github.com/margefson/secureforgeweb

## Nome do projeto

| Uso | Valor |
|---|---|
| Nome exibido | **SecureForge Web** |
| Pacote npm | `secure_forge_web` |
| API service | `secure-forge-web-api` |
| Trilha acadêmica | AppHardener (Trilha 1) |

## Tagline

*Diagnóstico & Hardening de Aplicações Web*

## Paleta

| Cor | Hex | Uso |
|---|---|---|
| Cyan primário | `#22d3ee` | Acentos, ícone, links |
| Fundo escuro | `#0f172a` | Background da interface |
| Texto | `#f8fafc` | Títulos e conteúdo principal |

## Arquivos de logo

| Arquivo | Uso |
|---|---|
| `frontend/public/icon.png` | Favicon, sidebar, telas de login/registro |
| `frontend/public/logo.png` | Logo horizontal (documentação, README, apresentações) |
| `assets/secure-forge-icon.png` | Cópia de referência do ícone gerado |
| `assets/secure-forge-logo.png` | Cópia de referência do logo completo |

## Componente React

```tsx
import BrandLogo from "@/components/BrandLogo";

<BrandLogo />                    // ícone + nome + subtítulo
<BrandLogo variant="icon" />     // apenas ícone
```

## Conceito

O ícone combina **escudo** (proteção) e **forja** (endurecimento/hardening), representando a proposta da ferramenta: forjar a postura de segurança de aplicações web de forma guiada.
