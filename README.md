# SecureForge Web: Avaliação Guiada e Hardening de Aplicações Web com Análise Assistida

## Resumo

A **SecureForge Web** é uma plataforma web (_full-stack_: React + Node.js/Express + PostgreSQL) para **avaliação guiada** da postura de segurança e **hardening** de aplicações web. Combina checklist alinhado a práticas OWASP/ASVS, validação humana e módulos de análise assistida (respostas HTTP, repositórios Git e, opcionalmente, modelos de linguagem). A ferramenta regista evidências por item, gera achados com recomendações, acompanha a postura ao longo do tempo e exporta relatórios em PDF.

Este repositório contém o código-fonte, o diagrama de arquitetura em `secureforgeweb_web/docs/screenshots/`, os PDFs do estudo de caso em `secureforgeweb_web/resultados/` e as instruções para instalar, executar e reproduzir as principais reivindicações do artigo _SecureForge Web: Avaliação Guiada e Hardening de Aplicações Web com Análise Assistida_ (SBSeg 2026 / Salão de Ferramentas — modalidade **Código Aberto**).

**Repositório:** [github.com/secureforgeweb/secureforgeweb](https://github.com/secureforgeweb/secureforgeweb)

| Recurso | Link |
|---------|------|
| **Vídeos de demonstração** | [Google Drive — demonstração](https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link) |
| **Pacote de instaladores** | [Google Drive — instaladores](https://drive.google.com/drive/folders/1TaGlQJnZbYwSjW1J5YGOxmcllMaqsjJV?usp=sharing) |
| **Licença** | [MIT](LICENSE) |

---

## Sumário

1. [Estrutura do README.md](#estrutura-do-readmemd)
2. [Selos considerados](#selos-considerados)
3. [Informações básicas](#informações-básicas)
4. [Dependências](#dependências)
5. [Preocupações com segurança](#preocupações-com-segurança)
6. [Instalação](#instalação)
7. [Teste mínimo](#teste-mínimo)
8. [Experimentos](#experimentos)
9. [LICENSE](#license)
10. [Vídeos de demonstração (playlist)](#vídeos-de-demonstração-playlist)

---

## Estrutura do README.md

Este README segue o modelo do CTA / Salão de Ferramentas do SBSeg 2026 e organiza-se em:

1. **Resumo** — objetivo do artefato e ligação ao artigo.
2. **Estrutura do README.md** — mapa deste documento e do repositório.
3. **Selos considerados** — selos pleiteados (D, F, S, R).
4. **Informações básicas** — capacidades, arquitetura e ambiente.
5. **Dependências** — software, versões e pacote de instaladores (Drive).
6. **Preocupações com segurança** — riscos e mitigação para avaliadores.
7. **Instalação** — clone, configuração e arranque (vídeos **01–04**).
8. **Teste mínimo** — toolchain + fluxo na interface (vídeo **05**).
9. **Experimentos** — reprodução das reivindicações do estudo de caso + PDFs em `resultados/`.
10. **LICENSE** — termos de uso.
11. **Vídeos de demonstração (playlist)** — download → instalação → clone → deps/banco → execução/resultados.

### Estrutura do repositório

```
secureforgeweb/
├── LICENSE                          ← MIT
├── README.md                        ← este ficheiro (artefato CTA / SF)
├── package.json                     ← atalhos pnpm para secureforgeweb_web/
└── secureforgeweb_web/              ← aplicação web (frontend + backend)
    ├── frontend/                    ← React 19, Vite 7, SPA
    ├── backend/                     ← Express, tRPC, Drizzle, assessores
    ├── docs/screenshots/            ← diagrama de arquitetura e capturas
    ├── resultados/                  ← PDFs de postura (estudo 24/07/2026)
    ├── scripts/                     ← helpers de BD / HTTPS
    ├── docker-compose.yml           ← PostgreSQL 16 opcional
    ├── package.json
    └── .env.example
```

| Pasta / ficheiro | Papel |
|------------------|-------|
| `secureforgeweb_web/` | Código principal da ferramenta |
| `secureforgeweb_web/docs/screenshots/` | Diagrama oficial e capturas de interface |
| `secureforgeweb_web/resultados/` | Relatórios PDF do estudo de caso (12 alvos) |
| `LICENSE` | Licença MIT |

---

## Selos considerados

Os autores solicitam a avaliação do artefato para **todos os selos** disponíveis no processo do [CTA / Avaliação de Artefato do SBSeg 2026](https://doc-artefatos.github.io/sbseg2026/):

| Selo | Nome | Justificativa na SecureForge Web |
|------|------|----------------------------------|
| **Selo D** | Artefatos Disponíveis | Código-fonte, este README, capturas e PDFs em [github.com/secureforgeweb/secureforgeweb](https://github.com/secureforgeweb/secureforgeweb); pastas Drive de [vídeos](https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link) e [instaladores](https://drive.google.com/drive/folders/1TaGlQJnZbYwSjW1J5YGOxmcllMaqsjJV?usp=sharing); licença MIT. |
| **Selo F** | Artefatos Funcionais | Dependências e [pacote de instaladores](#pacote-de-instaladores-google-drive); [Instalação](#instalação); **teste mínimo** (`pnpm check`, `pnpm test`) e fluxo UI (cadastro → checklist → achados → PDF); playlist **01–05**. |
| **Selo S** | Artefatos Sustentáveis | Código modular (`frontend/`, `backend/`); este README descreve estrutura, APIs e fluxo; diagrama em `secureforgeweb_web/docs/screenshots/arquitetura.png`. |
| **Selo R** | Experimentos Reprodutíveis | Estudo de caso com 12 alvos (Essential v1.0, 24/07/2026); PDFs em [`secureforgeweb_web/resultados/`](secureforgeweb_web/resultados/); secção [Experimentos](#experimentos) e playlist para reproduzir o fluxo ponta a ponta. |

> **Salão de Ferramentas (SF) 2026:** modalidade **Código Aberto** — URL da playlist = pasta Drive de [demonstração](https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link).

---

## Informações básicas

### Capacidades principais

* **Aplicações** — cadastro de URL base e/ou repositório Git; início de análises com escolha de checklist.
* **Catálogos** — **Checklist Essential SecureForge v1.0** (24 itens / 9 categorias) e **OWASP ASVS 5.0** (Level 1 e Complete); admin com **Sync ASVS**.
* **Wizard** — salvamento parcial; sugestões HTTP, Git e IA opcional; confirmação humana antes de gravar.
* **Achados e dashboard** — severidade, prioridade, score de postura, gráficos e exportação PDF.
* **Assistente de IA por usuário** — OpenAI, Gemini, Azure ou endpoint compatível; chaves por usuário (não no `.env` do repositório).
* **Administração** — usuários, itens de checklist, análises globais com filtros e comparação.
* **i18n** — interface em português e inglês.

### Arquitetura

Fluxo em três fases (cadastro → avaliação com evidências → postura/saída):

| Fase | Componentes |
|------|-------------|
| **Cadastro e entrada** | Analista (human-in-the-loop), cadastro da app (URL + Git), catálogo Essential 24 / ASVS 5.0 |
| **Avaliação e evidências** | Wizard, assessores HTTP/Git/IA, motor de evidências, PostgreSQL + Drizzle |
| **Postura e saída** | Achados, dashboard de postura, relatório PDF |

![Arquitetura do SecureForge Web — cadastro, avaliação e postura](secureforgeweb_web/docs/screenshots/arquitetura.png)

Figura: diagrama oficial de arquitetura (`secureforgeweb_web/docs/screenshots/arquitetura.png`).

#### Stack técnico

| Camada | Tecnologia |
|--------|------------|
| **Cliente** | React 19, Vite 7, TanStack Query, tRPC, wouter, Tailwind 4 |
| **Servidor** | Node.js 22, Express, tRPC (`/api/trpc`), JWT (`jose`) |
| **Persistência** | PostgreSQL 16+, Drizzle ORM |
| **Empacotamento** | pnpm (Corepack), TypeScript |
| **Extras** | Helmet/PDF, rate-limit, i18n PT/EN |

### Ambiente de execução recomendado

| Item | Especificação |
|------|----------------|
| **SO** | Windows 10/11, Linux ou macOS |
| **CPU / RAM** | ≥ 4 núcleos; ≥ 8 GB RAM |
| **Node.js** | **22** LTS |
| **PostgreSQL** | **16+** (local, Docker ou hospedado; o pacote Drive inclui EDB 18) |
| **Browser** | Chrome, Edge ou Firefox recente |

### Modo de execução

* **Desenvolvimento:** `pnpm dev` — API em `:3000` e Vite em `:5173` (proxy).
* **Produção:** `pnpm build` + `pnpm start`.

---

## Dependências

| Dependência | Versão / notas |
|-------------|----------------|
| **Git** | Qualquer versão recente |
| **Node.js** | **22** LTS (playlist / pacote Drive) |
| **Corepack + pnpm** | `corepack enable`; versão fixada em `secureforgeweb_web/package.json` |
| **PostgreSQL** | **16+** (playlist: instalador EDB **18**) |
| **Visual Studio Code** | Editor opcional |
| **Docker** | Opcional — `docker compose up -d` em `secureforgeweb_web/` |
| **Git LFS** | **Não** necessário neste projeto |

### Pacote de instaladores (Google Drive)

Espelho dos instaladores oficiais para Windows. Prefira as páginas oficiais quando possível; use o Drive para montar o ambiente mais rápido.

**Pasta:** [instaladores](https://drive.google.com/drive/folders/1TaGlQJnZbYwSjW1J5YGOxmcllMaqsjJV?usp=sharing)

| # | Arquivo (Drive) | O que é | Obrigatório? |
|---|-----------------|---------|--------------|
| 1 | `Git-2.55.0.3-64-bit.exe` | Git for Windows | Sim |
| 2 | `node-v22.23.1-x64.msi` | Node.js 22 LTS (+ Corepack → pnpm) | Sim |
| 3 | `postgresql-18.4-2-windows-x64.exe` | PostgreSQL (EDB 18) | Sim *ou* Docker |
| 4 | `VSCodeUserSetup-x64-1.130.0.exe` | Visual Studio Code | Opcional |
| 5 | `git-lfs-windows-v3.7.1.exe` | Git LFS | **Não** (não usado por este projeto) |

#### Sequência correta de instalação

| Passo | Ação | Vídeo |
|-------|------|-------|
| 1 | Descarregar Git, Node 22 e PostgreSQL (ou Docker) | **01** |
| 2 | Instalar e validar `git` / `node` / `pnpm` | **02** |
| 3 | Clonar o repositório | **03** |
| 4 | `.env`, `pnpm install`, `pnpm db:setup` | **04** |
| 5 | `pnpm dev` + fluxo na UI até PDF | **05** |

### Dependências opcionais

| Recurso | Uso | Obrigatório? |
|---------|-----|--------------|
| Chave de LLM (por usuário na UI) | Assistente IA no wizard | Não (há fallback heurístico) |
| mkcert / `pnpm https:setup` | Demo HTTPS local (headers CSP/HSTS) | Não |

---

## Preocupações com segurança

| Risco | Descrição |
|-------|-----------|
| **Alvos não confiáveis** | URLs/repos avaliados podem ser maliciosos — isole quando necessário. |
| **Segredos** | Nunca versionar `.env`; proteger `JWT_SECRET`, `DATABASE_URL` e chaves de LLM. |
| **Chaves de IA** | Configuradas por usuário na aplicação (não no `.env` do repositório). |
| **Produção** | `JWT_SECRET` forte (≥ 32 caracteres); HTTPS; sem credenciais admin padrão. |

### Medidas recomendadas

1. Executar em ambiente de desenvolvimento ou VM dedicada.
2. Não expor a instância local à Internet sem autenticação e HTTPS.
3. Usar apenas repositórios Git **públicos** HTTPS nos testes de clone.
4. Não gravar segredos reais nos vídeos de demonstração.

### Isenção de responsabilidade

Software fornecido **como está** para fins educativos e avaliação autorizada. Provedores de LLM de terceiros seguem os próprios termos.

---

## Instalação

> **Vídeos:** playlist **01–04** na pasta [demonstração](https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link); binários em [instaladores](https://drive.google.com/drive/folders/1TaGlQJnZbYwSjW1J5YGOxmcllMaqsjJV?usp=sharing).

### 1. Clonar o repositório

```bash
git clone https://github.com/secureforgeweb/secureforgeweb.git
cd secureforgeweb/secureforgeweb_web
```

### 2. Instalar dependências Node

No Windows, `corepack enable` em geral exige terminal **como Administrador**:

```powershell
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

Alternativas: `npm install -g pnpm` ou o [instalador do pnpm](https://pnpm.io/installation).

### 3. Configurar ambiente

```bash
cp .env.example .env
```

Edite `secureforgeweb_web/.env` — **mínimo obrigatório:**

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
```

### 4. Criar esquema e popular checklists

```bash
pnpm db:setup   # wait Postgres + migrate + seed Essential v1.0 + import ASVS 5.0
```

### 5. Arrancar a aplicação

```bash
pnpm dev
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API (tRPC) | http://localhost:3000/api/trpc |
| Health | http://localhost:3000/api/health |

**Atalhos a partir da raiz do repo:** `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm db:setup` (encaminham para `secureforgeweb_web/`).

### HTTPS local (opcional)

```powershell
pnpm https:setup
# No .env: VITE_DEV_HTTPS=1, HTTPS_CERT, HTTPS_KEY, ENABLE_SECURE_HEADERS=1,
# FRONTEND_URL=https://localhost:5173
pnpm dev
```

Para headers (CSP/HSTS), preferir cadastrar a app como **`https://localhost:3000`**.

---

## Teste mínimo

O teste mínimo tem **duas partes**: validação do toolchain e demonstração funcional na interface.

### Parte A — Toolchain

Com PostgreSQL a correr e `.env` configurado:

```bash
cd secureforgeweb_web
pnpm check
pnpm test
# opcional: pnpm build
```

**Resultado esperado:** ambos terminam com código 0.

### Parte B — Fluxo funcional na UI (vídeo **05**)

1. Com `pnpm dev` ativo, abra **http://localhost:5173**.
2. **Criar conta** / **entrar**.
3. (Opcional) Perfil → Assistente IA → testar conexão.
4. **Aplicações** → **Nova aplicação** (URL e/ou repositório Git públicos).
5. Iniciar análise com **Checklist Essential SecureForge v1.0**.
6. Percorrer o wizard (sugestões HTTP/Git/IA + confirmação humana).
7. **Concluir e gerar achados** → dashboard de postura → **Exportar PDF**.

**Resultado esperado:** análise concluída; score e achados visíveis; PDF descarregado.

---

## Experimentos

Esta secção reproduz o **estudo de caso** do artigo: avaliação com o perfil **Checklist Essential SecureForge v1.0** (24 itens / 9 categorias) sobre **12 alvos**, em **24/07/2026**.

Os PDFs exportados pela ferramenta estão em [`secureforgeweb_web/resultados/`](secureforgeweb_web/resultados/).

### Pré-requisitos

* Instalação concluída ([Instalação](#instalação)).
* `pnpm dev` em execução.
* Conta autenticada na interface.
* Alvos acessíveis (labs locais e/ou demos públicas).

### Indicadores de referência (Essential v1.0, 24/07/2026)

| Aplicação | Perfil | Score | Achados | C/A/M/B |
|-----------|--------|------:|--------:|---------|
| VAmPI | Lab. vulnerável | 25% | 18 | 4 / 9 / 5 / 0 |
| OWASP WebGoat (Java) | Lab. vulnerável | 29% | 17 | 5 / 8 / 4 / 0 |
| OWASP NodeGoat | Lab. vulnerável | 33% | 16 | 4 / 8 / 3 / 1 |
| OWASP WebGoat (PHP) | Lab. vulnerável | 33% | 16 | 5 / 6 / 5 / 0 |
| DVWA | Lab. vulnerável | 38% | 15 | 4 / 7 / 4 / 0 |
| OWASP Mutillidae II | Lab. vulnerável | 38% | 15 | 5 / 6 / 4 / 0 |
| Ghost CMS | Demo OSS | 42% | 14 | 3 / 7 / 4 / 0 |
| Gitea | Demo OSS | 42% | 14 | 3 / 7 / 3 / 1 |
| OWASP Juice Shop | Lab. vulnerável | 46% | 13 | 4 / 6 / 3 / 0 |
| Mattermost | Demo OSS | 58% | 10 | 3 / 5 / 1 / 1 |
| SecureForge Web | Autoavaliação | 63% | 9 | 1 / 4 / 4 / 0 |
| SecureForge Web v2 | Autoavaliação | **75%** | 6 | 1 / 2 / 3 / 0 |

C/A/M/B = crítica / alta / média / baixa. O score é a proporção de itens **conformes** + **N/A** sobre 24 itens.

### Reivindicação 1 — Fluxo ponta a ponta

**Objetivo:** demonstrar cadastro → análise assistida → revisão humana → achados → PDF.

**Passos:** seguir o [Teste mínimo — Parte B](#parte-b--fluxo-funcional-na-ui-vídeo-05) com um alvo (ex.: Juice Shop local ou a própria SecureForge em `http://localhost:5173`).

**Resultado esperado:** PDF e dashboard coerentes com o checklist Essential; evidências HTTP/Git quando URL/repo estiverem cadastrados.

### Reivindicação 2 — Laboratórios vulneráveis vs demos OSS

**Objetivo:** scores baixos em labs intencionalmente inseguros (25%–46%) e faixa intermédia em demos públicas (42%–58%).

**Passos:** cadastrar alvos da tabela; executar Essential v1.0; comparar com os PDFs em `resultados/`.

**Resultado esperado:** ordenação qualitativa alinhada à tabela (labs ≤ demos OSS ≤ autoavaliação endurecida).

### Reivindicação 3 — Ciclo de hardening (autoavaliação)

**Objetivo:** ilustrar 63% → 75% na SecureForge Web após hardening parcial.

**Passos:** avaliar a app local (baseline); aplicar remediações observáveis (ex.: headers); reavaliar; comparar PDFs `secureforgeweb-secureforge-web-*.pdf` e `…-v2-*.pdf`.

**Resultado esperado:** redução de achados e aumento de score na medição v2 (sem exigir conformidade plena).

> **Nota:** o estudo usou revisão por dois analistas com consenso; o LLM (`gpt-4o-mini`) foi opcional e as sugestões não substituíram a classificação final.

---

## LICENSE

[MIT](LICENSE) — ver também o campo `license` em `secureforgeweb_web/package.json`. As dependências mantêm as respectivas licenças.

---

## Vídeos de demonstração (playlist)

**Pasta Drive (vídeos):** https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link  
**Pasta Drive (instaladores):** https://drive.google.com/drive/folders/1TaGlQJnZbYwSjW1J5YGOxmcllMaqsjJV?usp=sharing  

Acesso recomendado: *qualquer pessoa com o link* (leitura).

| # | Ficheiro | Duração | Etapa |
|---|----------|---------|-------|
| **01** | `01-download-ferramentas.mp4` | ~2 min | Pasta instaladores Drive e/ou sites oficiais |
| **02** | `02-instalacao-config-ferramentas.mp4` | 2–3 min | Instalar Git, Node 22, PostgreSQL (ou Docker); ativar pnpm |
| **03** | `03-git-clone.mp4` | ~1 min | `git clone` do repositório oficial |
| **04** | `04-deps-env-banco.mp4` | ~5 min | `.env`, `pnpm install`, `pnpm db:setup` |
| **05** | `05-execucao-e-resultados.mp4` | 5–6 min | `pnpm dev` + cadastro, análise, dashboard e PDF |

**Duração total (01–05):** ~15–17 minutos.

### Comandos espelhados (Windows / PowerShell)

```powershell
# 03 — clone
git clone https://github.com/secureforgeweb/secureforgeweb.git
cd secureforgeweb\secureforgeweb_web

# 04 — deps e banco
copy .env.example .env
# editar DATABASE_URL e JWT_SECRET; opcional: docker compose up -d
pnpm install
pnpm db:setup

# 05 — execução
pnpm dev
# abrir http://localhost:5173
```

Chamada SBSeg SF: https://www.sbseg2026.uff.br/chamadas/sf/
