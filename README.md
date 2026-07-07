# SecureForge Web

**Plataforma de Diagnóstico e Hardening de Aplicações Web**

Projeto da Trilha 1 — AppHardener (Projeto Integrador: Segurança Aplicada).

**Repositório:** https://github.com/margefson/secureforgeweb

![SecureForge Web](frontend/public/logo.png)

## Status atual

Protótipo **funcional e demonstrável** — **Entrega 3 concluída** (30/06/2026): fluxo principal consolidado.

| Área | Capacidades |
|---|---|
| **Fluxo core** | Cadastro → wizard OWASP → achados → dashboard → PDF |
| **Checklist** | 24 itens em 9 categorias (seed v1.0) |
| **Automação** | Headers HTTP, repositório Git, assistente IA (por categoria/item) |
| **Assistente IA** | **Por usuário** — OpenAI, Gemini, Azure, custom (`/profile/ai-assistant`) |
| **Multiusuário** | Cada operador com modelo/chave próprios; admin vê todas as análises |
| **Admin** | Usuários, checklist OWASP, **análises globais + benchmark gráfico** |
| **Infra** | PostgreSQL 16, Drizzle ORM, JWT, RBAC, notificações |

Relatório desta entrega: [docs/RELATORIO_ENTREGA_3.md](docs/RELATORIO_ENTREGA_3.md)

Identidade visual: [docs/BRAND.md](docs/BRAND.md)

---

## Pré-requisitos

| Ferramenta | Versão mínima | Verificação |
|---|---|---|
| Node.js | 22.x | `node --version` |
| pnpm | 10.x | `pnpm --version` |
| PostgreSQL | 16+ | `psql --version` ou Docker |
| Git | qualquer | `git --version` |

**Opcional:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) para PostgreSQL local.

**Opcional (LLM):** configure o assistente em **Perfil → Configurar Assistente IA** após login — não é necessário `OPENAI_API_KEY` no `.env`.

---

## Passo a passo — rodar localmente (Windows)

### 1. Clonar e entrar no projeto

```powershell
git clone https://github.com/margefson/secureforgeweb.git
cd secureforgeweb
```

### 2. Instalar dependências

```powershell
pnpm install
```

### 3. Configurar variáveis de ambiente

```powershell
Copy-Item .env.example .env
```

Mínimo necessário no `.env`:

```env
DATABASE_URL=postgresql://secureforgeweb_user:secureforgeweb_pass@localhost:5432/secureforgeweb
JWT_SECRET=sua_chave_secreta_com_pelo_menos_32_caracteres_aleatorios
PORT=3000
FRONTEND_URL=http://localhost:5173
VITE_API_PROXY_TARGET=http://localhost:3000
```

> `JWT_SECRET` deve ter no mínimo 32 caracteres.

### 4. Subir o PostgreSQL

**Docker (recomendado):**

```powershell
docker compose up -d
```

Ou: `.\scripts\setup-local-db.ps1`

**PostgreSQL local:** `psql -U postgres -f scripts/init-postgres.sql`

### 5. Criar tabelas e popular o checklist

```powershell
pnpm db:setup
```

Inclui migrações até `0016` (config IA por usuário + registro de execuções).

### 6. Iniciar a aplicação

```powershell
pnpm dev
```

| Serviço | URL |
|---|---|
| **Frontend** | http://localhost:5173 |
| **API (tRPC)** | http://localhost:3000/api/trpc |
| **Health check** | http://localhost:3000/api/health |

### 7. Testar no navegador

1. Acesse http://localhost:5173 e crie uma conta
2. **Perfil → Configurar Assistente IA** (opcional, para LLM)
3. **Aplicações → Nova Aplicação** (URL base e/ou repositório Git)
4. **Iniciar análise** — wizard com automações HTTP / Git / IA
5. Concluir → achados → **dashboard** → **Exportar PDF**
6. *(Admin)* **Análises globais** — comparar execuções entre usuários/modelos

Roteiro completo: [docs/DEMO.md](docs/DEMO.md)

---

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `pnpm dev` | Backend (:3000) + frontend (:5173) |
| `pnpm build` | Build de produção |
| `pnpm check` | Verificação TypeScript |
| `pnpm test` | Testes Vitest (domínio PosturaWeb) |
| `pnpm db:setup` | Aguarda DB + migrações + seed |
| `pnpm db:migrate` | Aplica migrações pendentes |

---

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/MANUAL.md](docs/MANUAL.md) | Manual de uso |
| [docs/DEMO.md](docs/DEMO.md) | Roteiro de demonstração (Entrega 3) |
| [docs/APRESENTACAO.md](docs/APRESENTACAO.md) | Roteiro de slides |
| [docs/RELATORIO_ENTREGA_3.md](docs/RELATORIO_ENTREGA_3.md) | **Relatório Entrega 3** (estado atual) |
| [docs/RELATORIO_ENTREGA_2.md](docs/RELATORIO_ENTREGA_2.md) | Relatório Entrega 2 |
| [docs/PROJETO_ARQUITETURAL.md](docs/PROJETO_ARQUITETURAL.md) | Arquitetura alvo |
| [docs/GUIA_IMPLEMENTACAO.md](docs/GUIA_IMPLEMENTACAO.md) | Cronograma e fases |
| [docs/BRAND.md](docs/BRAND.md) | Identidade visual |

Índice: [docs/README.md](docs/README.md)

---

## Stack

React 19 · Vite 7 · Tailwind 4 · tRPC 11 · Express · Drizzle ORM · PostgreSQL 16 · Recharts · PDFKit

## Licença

MIT
