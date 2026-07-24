# SecureForge Web

**Plataforma web para diagnóstico de postura de segurança e hardening guiado alinhado a OWASP.**

Cadastre aplicações web, execute avaliações por checklist, colete evidências automatizadas (headers HTTP, sinais de repositório Git e LLM opcional por usuário), gerencie achados, acompanhe a postura ao longo do tempo e exporte relatórios em PDF.

| Recurso | Link |
|---------|------|
| **Código-fonte** | [github.com/secureforgeweb/secureforgeweb](https://github.com/secureforgeweb/secureforgeweb) |
| **Vídeos de demonstração** | [Google Drive — demonstração](https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link) |
| **Manual do usuário** | [`secureforgeweb_web/docs/MANUAL.md`](secureforgeweb_web/docs/MANUAL.md) |
| **Projeto arquitetural** | [`secureforgeweb_web/docs/PROJETO_ARQUITETURAL.md`](secureforgeweb_web/docs/PROJETO_ARQUITETURAL.md) |
| **Capturas de tela** | [`secureforgeweb_web/docs/screenshots/`](secureforgeweb_web/docs/screenshots/) |
| **Guia operacional** | [`secureforgeweb_web/readme-web.md`](secureforgeweb_web/readme-web.md) |
| **Licença** | [MIT](LICENSE) |

**SBSeg 2026 — Salão de Ferramentas:** modalidade **Código Aberto** (código e documentação públicos + vídeo técnico). Chamada: [sbseg2026.uff.br/chamadas/sf](https://www.sbseg2026.uff.br/chamadas/sf/).

---

## Sumário

1. [Arranque rápido](#arranque-rápido)
2. [O que a ferramenta faz](#o-que-a-ferramenta-faz)
3. [Arquitetura](#arquitetura)
4. [Estrutura do repositório](#estrutura-do-repositório)
5. [Dependências](#dependências)
6. [Notas de segurança](#notas-de-segurança)
7. [Instalação](#instalação)
8. [Teste mínimo](#teste-mínimo)
9. [Mapa da documentação](#mapa-da-documentação)
10. [Licença](#licença)

---

## Arranque rápido

```bash
git clone https://github.com/secureforgeweb/secureforgeweb.git
cd secureforgeweb/secureforgeweb_web
cp .env.example .env   # defina DATABASE_URL e JWT_SECRET (≥ 32 caracteres)
pnpm install
pnpm db:setup          # migrate + seed Essential v1.0 + import ASVS 5.0
pnpm dev
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API (tRPC) | http://localhost:3000/api/trpc |
| Health | http://localhost:3000/api/health |

Na raiz do repositório também funcionam `pnpm dev`, `pnpm build`, `pnpm test` e `pnpm db:setup` (encaminham para `secureforgeweb_web/`).

**pnpm no Windows:** `corepack enable` em geral exige terminal **como Administrador**. Alternativas: `npm install -g pnpm` ou o [instalador do pnpm](https://pnpm.io/installation).

Guia completo (variáveis, HTTPS local, sync ASVS): [`secureforgeweb_web/readme-web.md`](secureforgeweb_web/readme-web.md).

---

## O que a ferramenta faz

* **Aplicações** — cadastro de URL base e/ou repositório Git; início de análises com escolha de checklist.
* **Catálogos de checklist** — **Essential SecureForge v1.0** (24 itens / 9 categorias) e **OWASP ASVS 5.0** (Level 1 e Complete); admin com **Sync ASVS**.
* **Wizard** — salvamento parcial; sugestões HTTP, Git e IA opcional por item; confirmação humana antes de gravar.
* **Achados e dashboard** — severidade, prioridade, score de postura, gráficos e exportação PDF.
* **Assistente de IA por usuário** — OpenAI, Gemini, Azure ou endpoint customizado; chaves por usuário (não no `.env` do repositório).
* **Administração** — usuários, itens de checklist, visão global de análises com filtros e gráficos comparativos.
* **i18n** — interface em português e inglês; mensagens da API seguem o cabeçalho `x-locale`.

Contexto acadêmico: trilha integradora **AppHardener** (segurança aplicada / hardening web).

> Ao avaliar **URLs ou repositórios de terceiros**, trate os alvos como **não confiáveis**. Nunca versione segredos nem credenciais de produção.

---

## Arquitetura

Fluxo em três fases (cadastro → avaliação com evidências → postura/saída), alinhado à implementação atual:

| Fase | Componentes |
|------|-------------|
| **Cadastro e entrada** | Analista (human-in-the-loop), cadastro da app (URL + Git), catálogo Essential 24 / ASVS 5.0 |
| **Avaliação e evidências** | Wizard, assessores HTTP/Git/IA, motor de evidências, PostgreSQL + Drizzle, integrações outbound |
| **Postura e saída** | Achados, dashboard de postura, relatório PDF |

![Arquitetura do SecureForge Web — cadastro, avaliação e postura](secureforgeweb_web/docs/screenshots/arquitetura.png)

Figura: diagrama oficial de arquitetura (`docs/screenshots/arquitetura.png`).

**Execução:** em desenvolvimento, API na porta `:3000` e Vite na `:5173` (com proxy). Em produção: `pnpm build` e depois `pnpm start`.

Stack resumida: React 19 · Vite 7 · Express/tRPC · Node 22 · PostgreSQL 16 · Drizzle · Helmet/PDF.

---

## Estrutura do repositório

```
secureforgeweb/
├── LICENSE                          ← MIT
├── README.md                        ← este ficheiro (PT)
├── package.json                     ← encaminha scripts para secureforgeweb_web/
└── secureforgeweb_web/              ← pacote pnpm principal
    ├── frontend/                    ← SPA React / Vite
    ├── backend/                     ← Express, tRPC, Drizzle, assessores
    ├── docs/
    │   ├── MANUAL.md
    │   ├── PROJETO_ARQUITETURAL.md
    │   ├── README.md                ← índice + link dos vídeos
    │   └── screenshots/
    ├── scripts/                     ← helpers de BD / HTTPS
    ├── readme-web.md                ← README operacional
    ├── docker-compose.yml           ← PostgreSQL 16 opcional
    └── .env.example
```

Outros ficheiros em `docs/` (rascunhos, Overleaf, PDFs locais) estão no **`.gitignore`** e permanecem só nas máquinas dos autores.

---

## Dependências

| Dependência | Notas |
|-------------|--------|
| **Git** | Clonar este repositório |
| **Node.js 22.x** | Ver `secureforgeweb_web/package.json` |
| **pnpm** | Via Corepack ou instalação standalone |
| **PostgreSQL 16+** | Obrigatório (`DATABASE_URL`) |
| **Docker** (opcional) | `docker compose up -d` em `secureforgeweb_web/` |

Recomendado: ≥ 8 GB de RAM; Chrome, Edge ou Firefox recentes.

---

## Notas de segurança

| Vetor | Orientação |
|-------|------------|
| Alvos não confiáveis | URLs/repos avaliados podem ser maliciosos — isole quando necessário |
| Segredos | Nunca versione `.env`; proteja `JWT_SECRET`, BD e chaves de LLM |
| Chaves de IA | Por usuário na BD / caminhos gitignored |
| Produção | `JWT_SECRET` forte (≥ 32 caracteres); HTTPS; sem credenciais admin padrão |

Demo HTTPS local (headers / autoavaliação): em `secureforgeweb_web/`, execute `pnpm https:setup`, defina `VITE_DEV_HTTPS=1`, `ENABLE_SECURE_HEADERS=1` e os caminhos dos certificados. Para HEADER-\* / DATA-01, prefira a URL **`https://localhost:3000`**.

**Aviso:** software fornecido “como está” para fins educativos e avaliação autorizada. Provedores de LLM de terceiros seguem os próprios termos.

---

## Instalação

1. Instale o **Node.js 22** e ative o **pnpm** (ver [Arranque rápido](#arranque-rápido)).
2. Copie `secureforgeweb_web/.env.example` → `secureforgeweb_web/.env`.
3. Defina pelo menos `DATABASE_URL` e `JWT_SECRET`.
4. Em `secureforgeweb_web/`: `pnpm install` → `pnpm db:setup` → `pnpm dev`.

Manutenção opcional do ASVS:

```bash
pnpm db:import-asvs   # primeira importação (L1 + Complete)
pnpm db:sync-asvs     # atualizar a partir do OWASP (também na UI admin)
```

---

## Teste mínimo

```bash
cd secureforgeweb_web
pnpm check
pnpm test
# opcional: pnpm build
```

---

## Mapa da documentação

| Documento | Função |
|-----------|--------|
| Este `README.md` | Entrada pública do projeto (GitHub / revisores SBSeg) |
| [`secureforgeweb_web/readme-web.md`](secureforgeweb_web/readme-web.md) | Variáveis, scripts, ops Windows/HTTPS |
| [`secureforgeweb_web/docs/MANUAL.md`](secureforgeweb_web/docs/MANUAL.md) | Manual do usuário |
| [`secureforgeweb_web/docs/PROJETO_ARQUITETURAL.md`](secureforgeweb_web/docs/PROJETO_ARQUITETURAL.md) | Arquitetura e requisitos (texto) |
| [`secureforgeweb_web/docs/screenshots/arquitetura.png`](secureforgeweb_web/docs/screenshots/arquitetura.png) | **Diagrama oficial de arquitetura** |
| [`secureforgeweb_web/docs/README.md`](secureforgeweb_web/docs/README.md) | Índice + pasta Drive dos vídeos |
| [Vídeos (Drive)](https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link) | Instalação e demonstração das funcionalidades |

---

## Licença

[MIT](LICENSE) — ver também o campo `license` em `secureforgeweb_web/package.json`. As dependências mantêm as respectivas licenças.
