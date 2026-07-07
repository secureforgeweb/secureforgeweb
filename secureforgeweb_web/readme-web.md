# SecureForge Web — aplicação web (`secureforgeweb_web`)

**Único README operacional desta pasta.** Comandos `pnpm`, variáveis de ambiente e setup local.

| Secção | Conteúdo |
|--------|-----------|
| [Arranque rápido](#arranque-rápido) | `pnpm`, `.env`, comandos |
| [Documentação](#documentação) | Manuais em `docs/` |
| [Frontend](#frontend) | Stack, estrutura |
| [Backend](#backend) | API, Drizzle, testes |
| [Scripts](#scripts) | Base de dados e Docker |

**Repositório Git:** [github.com/secureforgeweb/secureforgeweb](https://github.com/secureforgeweb/secureforgeweb)

---

## Arranque rápido

- **`frontend/`** — React, Vite, Tailwind, shadcn/ui. Código em `frontend/src/`.
- **`backend/`** — Node, Express, tRPC, Drizzle, PostgreSQL.

**Variáveis:** copie **`.env.example`** para **`.env` nesta pasta** (`secureforgeweb_web/.env`).

```powershell
cd secureforgeweb_web
pnpm install
pnpm db:setup
pnpm dev
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API (tRPC) | http://localhost:3000/api/trpc |
| Health | http://localhost:3000/api/health |

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

Ficheiros em **`docs/`**:

| Documento | Público |
|-----------|---------|
| [`docs/MANUAL.md`](docs/MANUAL.md) | Utilizadores — fluxo completo |
| [`docs/DEMO.md`](docs/DEMO.md) | Demonstração (~18–22 min) |
| [`docs/APRESENTACAO.md`](docs/APRESENTACAO.md) | Roteiro de slides |
| [`docs/RELATORIO.md`](docs/RELATORIO.md) | Relatório (estado atual) |
| [`docs/BRAND.md`](docs/BRAND.md) | Identidade visual |
| [`docs/README.md`](docs/README.md) | Índice completo |

README internacional (inglês) na **raiz do repositório**: [`../README.md`](../README.md).

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

```
frontend/
├── index.html
├── config/          # vite.config.ts, tsconfig, components.json
├── public/          # logo, ícones
└── src/
    ├── _core/       # App.tsx, main.tsx
    ├── views/       # páginas (Login, Applications, Wizard, Admin, …)
    ├── components/  # ui/, layout
    └── lib/         # trpc, utils
```

---

## Backend

| Pasta | Conteúdo |
|-------|----------|
| `src/_core/` | Express, tRPC, env, OAuth, Vite (prod) |
| `src/controllers/` | Routers tRPC |
| `src/models/` | Drizzle / acesso a dados |
| `src/services/` | PDF, assessores HTTP/Git/IA, e-mail |
| `drizzle/` | Schema e migrações |
| `scripts/` | seed checklist, wait-for-postgres |

**Base de dados:**

```powershell
pnpm db:setup      # wait + migrate + seed
pnpm db:migrate    # só migrações
```

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
| `pnpm db:setup` | Aguarda Postgres + migrações + seed OWASP |
| `scripts/setup-local-db.ps1` | Sobe Postgres via Docker (Windows) |
| `scripts/init-postgres.sql` | Criação manual de role/DB |

---

## Estado atual (Entrega 3)

Protótipo funcional: cadastro → wizard OWASP (24 itens / 9 categorias) → achados → dashboard → PDF; IA por utilizador; admin com análises globais e gráfico comparativo.

Detalhes: [`docs/RELATORIO.md`](docs/RELATORIO.md).

---

*Atualize este ficheiro quando mudarem rotas, variáveis de ambiente ou estrutura relevante.*
