# SecureForge Web — aplicação web (`secureforgeweb_web`)

**Único README operacional desta pasta.** Comandos `pnpm`, variáveis de ambiente e setup local.

| Secção | Conteúdo |
|--------|-----------|
| [Arranque rápido](#arranque-rápido) | `pnpm`, `.env`, comandos |
| [Documentação](#documentação) | Manuais em `docs/` |
| [Frontend](#frontend) | Stack, i18n, estrutura |
| [Backend](#backend) | API, Drizzle, ASVS, testes |
| [Scripts](#scripts) | Base de dados, Docker, ASVS |

**Repositório Git:** [github.com/secureforgeweb/secureforgeweb](https://github.com/secureforgeweb/secureforgeweb)

---

## Arranque rápido

- **`frontend/`** — React, Vite, Tailwind, shadcn/ui. Código em `frontend/src/`.
- **`backend/`** — Node, Express, tRPC, Drizzle, PostgreSQL.

### Pré-requisito: pnpm via Corepack (Windows)

O Node.js inclui o **Corepack**, usado para ativar o `pnpm` do projeto.

> **Importante (Windows):** o comando `corepack enable` precisa de um terminal **como Administrador**. Sem isso, aparece erro de permissão (*Access is denied* / *EPERM*).

```powershell
# 1) Abra PowerShell ou CMD com "Executar como administrador"
# 2) Execute:
corepack enable
corepack prepare pnpm@latest --activate
```

Depois feche o terminal de administrador e continue num shell **normal**.

**Se não puder usar Administrador**, escolha uma alternativa:

```powershell
# A) pnpm global via npm
npm install -g pnpm

# B) instalador standalone (sem Corepack)
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

Confirme: `pnpm -v`.

**Variáveis:** copie **`.env.example`** para **`.env` nesta pasta** (`secureforgeweb_web/.env`).

```powershell
cd secureforgeweb_web
pnpm install
pnpm db:setup
pnpm dev
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 (ou https://localhost:5173 com TLS local) |
| API (tRPC) | http://localhost:3000/api/trpc (ou https) |
| Health | http://localhost:3000/api/health |

### HTTPS local (demo / autoavaliação de headers)

```powershell
pnpm https:setup   # gera certs mkcert em certs/ e sugere vars no .env
```

No `.env`: `VITE_DEV_HTTPS=1`, `HTTPS_CERT`/`HTTPS_KEY`, `ENABLE_SECURE_HEADERS=1`, `FRONTEND_URL=https://localhost:5173`.  
Para o checklist HTTP (CSP/HSTS), cadastre a app com **`https://localhost:3000`**.

Mínimo no `.env`:

```env
DATABASE_URL=postgresql://secureforgeweb_user:secureforgeweb_pass@localhost:5432/secureforgeweb
JWT_SECRET=sua_chave_secreta_com_pelo_menos_32_caracteres_aleatorios
PORT=3000
FRONTEND_URL=http://localhost:5173
VITE_API_PROXY_TARGET=http://localhost:3000
```

**PostgreSQL (Docker):**

```powershell
docker compose up -d
# ou
.\scripts\setup-local-db.ps1
```

**Na raiz do repositório** (encaminha para esta pasta):

```powershell
pnpm dev
pnpm build
pnpm test
pnpm check
pnpm db:setup
```

---

## Documentação

Ficheiros em **`docs/`** e links oficiais:

| Recurso | Conteúdo |
|---------|----------|
| [`docs/MANUAL.md`](docs/MANUAL.md) | Utilizadores — fluxo completo |
| [`docs/PROJETO_ARQUITETURAL.md`](docs/PROJETO_ARQUITETURAL.md) | Arquitetura alvo |
| [`docs/README.md`](docs/README.md) | Índice + screenshots + vídeos |
| [`docs/screenshots/arquitetura.png`](docs/screenshots/arquitetura.png) | Diagrama oficial de arquitetura |
| [`docs/screenshots/`](docs/screenshots/) | Capturas de ecrã |
| [Vídeos de demonstração (Drive)](https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link) | Instalação e funcionalidades (SBSeg SF) |
| [`docs/PLAYLIST_DEMONSTRACAO.md`](docs/PLAYLIST_DEMONSTRACAO.md) | Roteiro da playlist (copiar para o Drive) |

README do repositório na **raiz**: [`../README.md`](../README.md).

---

## Frontend

Comandos `pnpm` correm na **raiz `secureforgeweb_web/`**.

| Área | Tecnologia |
|------|------------|
| UI | React 19 + TypeScript |
| Build | Vite 7 |
| Estilos | Tailwind CSS 4 |
| Componentes | shadcn/ui (Radix) |
| Rotas | wouter |
| Dados | tRPC v11 + TanStack Query |
| Gráficos | Recharts |
| i18n | `frontend/src/i18n/messages.ts` + `ChecklistLocaleContext` (PT/EN) |
| Tabelas admin | `useResizableColumns` + `ResizableTable` (preferências em `localStorage`) |

```
frontend/
├── index.html
├── config/          # vite.config.ts, tsconfig, components.json
├── public/          # logo, ícones
└── src/
    ├── _core/       # App.tsx, main.tsx (envia header x-locale ao tRPC)
    ├── views/       # páginas (Login, Applications, Wizard, Admin, …)
    ├── components/  # ui/, layout, PublicPageControls, ResizableTable
    ├── contexts/    # ChecklistLocaleContext
    ├── hooks/       # useResizableColumns
    ├── i18n/        # messages, formatLocaleDate, useEnumLabels
    └── lib/         # trpc, utils
```

**Idioma:** toggle **PT / EN** nas páginas públicas (Home, Login, Registro) e no header autenticado. Chave `localStorage`: `secureforgeweb-checklist-locale`. O frontend envia `x-locale` em todas as requisições tRPC; erros de validação e mensagens do backend seguem o idioma escolhido.

**Menu lateral:** botão no header ou `Ctrl+B` para expandir/recolher; estado guardado em cookie `sidebar_state`.

**Tabelas admin:** larguras de coluna em `localStorage` (`secureforgeweb-table-widths-{key}`); arrastar a borda do cabeçalho para redimensionar.

---

## Backend

| Pasta | Conteúdo |
|-------|----------|
| `src/_core/` | Express, tRPC, env, context (`locale` por request) |
| `src/controllers/` | Routers tRPC |
| `src/models/` | Drizzle / acesso a dados |
| `src/services/` | PDF, assessores HTTP/Git/IA, **asvsCatalog** |
| `shared/` | `apiErrors`, `checklistLocale`, `requestLocale`, `asvsAutomationMap` |
| `drizzle/` | Schema e migrações (`0018` ASVS, `0019` i18n checklist) |
| `scripts/` | seed Essential, import/sync ASVS, wait-for-postgres |

**Base de dados:**

```powershell
pnpm db:setup         # wait + migrate + seed Essential + import ASVS
pnpm db:migrate       # só migrações
pnpm db:seed          # checklist Essential v1.0 (24 itens)
pnpm db:import-asvs   # catálogos ASVS 5.0 (L1 + Complete)
pnpm db:sync-asvs     # atualizar ASVS a partir da fonte OWASP
```

**Checklists disponíveis após `db:setup`:**

| Catálogo | Perfil | Uso |
|----------|--------|-----|
| Checklist Essential SecureForge | `essential` v1.0 | 24 itens / 9 categorias — default rápido |
| OWASP ASVS 5.0 — Level 1 | `asvs_l1` | Subconjunto L1 |
| OWASP ASVS 5.0 — Complete | `asvs_full` | Catálogo completo (~345 requisitos) |

**Testes:**

```powershell
pnpm check
pnpm test
```

**Assistente IA:** configurado **por utilizador** em `/profile/ai-assistant` — não é obrigatório no `.env`.

---

## Scripts

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | API (:3000) + frontend (:5173) |
| `pnpm build` | Build de produção |
| `pnpm start` | Servidor de produção |
| `pnpm db:setup` | Postgres + migrações + seed + import ASVS |
| `pnpm db:import-asvs` | Importar ASVS 5.0 (L1 + Complete) |
| `pnpm db:sync-asvs` | Sincronizar ASVS com fonte remota |
| `scripts/setup-local-db.ps1` | Sobe Postgres via Docker (Windows) |
| `scripts/init-postgres.sql` | Criação manual de role/DB |

---

## Estado atual (julho/2026)

Protótipo funcional e evoluído:

- Fluxo ponta a ponta: cadastro → wizard → achados → dashboard → PDF
- **ASVS 5.0** (L1 + Complete) com sync administrativo e filtros no wizard
- **i18n PT/EN** na UI e mensagens de erro do backend
- IA por utilizador; admin com análises globais, gráfico comparativo e tabelas redimensionáveis
- Admin Checklist Items: busca, filtros, navegação por capítulo, colunas ajustáveis

Detalhes: [`docs/PROJETO_ARQUITETURAL.md`](docs/PROJETO_ARQUITETURAL.md) e [`docs/MANUAL.md`](docs/MANUAL.md).

---

*Atualize este ficheiro quando mudarem rotas, variáveis de ambiente ou estrutura relevante.*
