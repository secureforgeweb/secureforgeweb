# SecureForge Web — Identidade visual

**Repositório:** https://github.com/secureforgeweb/secureforgeweb

## Nome do projeto

| Uso | Valor |
|---|---|
| Nome exibido | **SecureForge Web** |
| Pacote npm | `secureforgeweb_web` |
| API service | `secure-forge-web-api` |
| Codinome do projeto | AppHardener |

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
| `docs/assets/github-avatar.png` | Avatar do perfil GitHub (`secureforgeweb`) |

## Componente React

```tsx
import BrandLogo from "@/components/BrandLogo";

<BrandLogo />                    // ícone + nome + subtítulo
<BrandLogo variant="icon" />     // apenas ícone
```

## Conceito

O ícone combina **escudo** (proteção) e **forja** (endurecimento/hardening), representando a proposta da ferramenta: forjar a postura de segurança de aplicações web de forma guiada.
