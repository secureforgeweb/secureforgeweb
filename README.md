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
| **Selo F** | Artefatos Funcionais | Dependências e [pacote de instaladores](#pacote-de-instaladores-google-drive); [Instalação](#instalação); **teste mínimo** (`pnpm check`, `pnpm test` — suíte da SecureForge Web/postura) e fluxo UI (cadastro → checklist → achados → PDF); playlist **01–05**. |
| **Selo S** | Artefatos Sustentáveis | Código modular (`frontend/`, `backend/`); este README descreve estrutura, APIs e fluxo; diagrama em `secureforgeweb_web/docs/screenshots/arquitetura.png`; testes alinhados ao produto submetido (sem suíte legado Incident/ML). |
| **Selo R** | Experimentos Reprodutíveis | Estudo Essential v1.0 (24/07/2026, 12 alvos); PDFs + [protocolo](secureforgeweb_web/resultados/PROTOCOLO_ESTUDO.md) em [`resultados/`](secureforgeweb_web/resultados/); secção [Experimentos](#experimentos). |

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
| **PostgreSQL** | **16+** (playlist: instalador EDB **18** local; Docker opcional) |
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
| **PostgreSQL** | **16+** — caminho da playlist: instalador EDB **18** (serviço local, porta 5432) |
| **Visual Studio Code** | Editor opcional |
| **Docker** | Alternativa opcional ao EDB — `docker compose up -d` em `secureforgeweb_web/` |

### Pacote de instaladores (Google Drive)

Espelho dos instaladores oficiais para Windows. Prefira as páginas oficiais quando possível; use o Drive para montar o ambiente mais rápido.

**Pasta:** [instaladores](https://drive.google.com/drive/folders/1TaGlQJnZbYwSjW1J5YGOxmcllMaqsjJV?usp=sharing)

| # | Arquivo (Drive) | O que é | Obrigatório? |
|---|-----------------|---------|--------------|
| 1 | `Git-2.55.0.3-64-bit.exe` | Git for Windows | Sim |
| 2 | `node-v22.23.1-x64.msi` | Node.js 22 LTS (+ Corepack → pnpm) | Sim |
| 3 | `postgresql-18.4-2-windows-x64.exe` | PostgreSQL (EDB 18) — caminho da playlist | Sim (Docker é só alternativa) |
| 4 | `VSCodeUserSetup-x64-1.130.0.exe` | Visual Studio Code | Opcional |

#### Sequência correta de instalação

| Passo | Ação | Vídeo |
|-------|------|-------|
| 1 | Descarregar Git, Node 22 e PostgreSQL EDB | **01** |
| 2 | Instalar e validar `git` / `node` / `pnpm` (+ serviço Postgres) | **02** |
| 3 | Clonar o repositório | **03** |
| 4 | `.env`, `init-postgres.sql`, `pnpm install`, `pnpm db:setup` | **04** |
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
| **SSRF (módulo HTTP)** | A ferramenta faz GET no servidor à URL cadastrada. Destinos privados (RFC1918), link-local e metadados de nuvem (`169.254.169.254`) são **bloqueados** após validação da URL e da resolução DNS; redirecionamentos são revalidados (máx. 3 hops). Loopback (`localhost` / `127.0.0.1`) permanece permitido para labs locais. Para avaliar alvos em LAN, defina `ALLOW_PRIVATE_ASSESSMENT=1`. |
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

O nome da base no final da `DATABASE_URL` (`secureforgeweb`) tem de existir **antes** de `pnpm db:setup`. Se mudar user/senha/base, alinhe também `scripts/init-postgres.sql` (passo 4).

### 4. Criar a base PostgreSQL (obrigatório) — caminho da playlist (EDB)

Na playlist (vídeos **02** + **04**) o banco é o **PostgreSQL local** instalado via EDB, não Docker.

`pnpm db:setup` **não cria** o utilizador nem a base vazia — só espera a ligação, aplica migrações e faz seed/import.

Com o serviço PostgreSQL a correr na porta **5432**:

1. Defina a `DATABASE_URL` no `.env` (user, senha e nome da base). Pode usar o superutilizador criado no instalador EDB (ex.: `postgres` / senha que escolheu) **ou** o user do `.env.example`.
2. **Edite `scripts/init-postgres.sql`** para o `CREATE USER` / `PASSWORD` / `CREATE DATABASE` / `OWNER` coincidirem com essa `DATABASE_URL` (se já usar os defaults do `.env.example`, o script já está alinhado).
3. Crie a base como superutilizador `postgres`:

```powershell
# Ajuste o caminho do psql se necessário (ex.: "C:\Program Files\PostgreSQL\18\bin\psql.exe")
psql -U postgres -f scripts/init-postgres.sql
```

Atalho: `.\scripts\setup-local-db.ps1` (mostra/executa o fluxo local).

**Alternativa opcional — Docker** (não é o caminho do vídeo 04): `docker compose up -d` cria user + base `secureforgeweb` com os valores do `.env.example`.

### 5. Criar esquema e popular checklists

```bash
pnpm db:setup   # wait Postgres + migrate + seed Essential v1.0 + import ASVS 5.0
```

Se aparecer `database "…" does not exist`: a base da `DATABASE_URL` ainda não foi criada — volte ao passo 4 (`psql … init-postgres.sql`) e confirme que o nome no `.env` e no SQL são o mesmo.
### 6. Arrancar a aplicação

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

**Resultado esperado:** ambos terminam com código 0. A suíte `pnpm test` cobre a SecureForge Web (postura OWASP: auth, aplicações, análises, assessores, SSRF, PDF, etc.) — **não** inclui testes do produto legado Incident Sys / Flask ML.

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

Os PDFs exportados pela ferramenta estão em [`secureforgeweb_web/resultados/`](secureforgeweb_web/resultados/). O protocolo detalhado (alvos, consenso, hardening 63%→75%, limitações) está em [`secureforgeweb_web/resultados/PROTOCOLO_ESTUDO.md`](secureforgeweb_web/resultados/PROTOCOLO_ESTUDO.md).

### Pré-requisitos

* Instalação concluída ([Instalação](#instalação)).
* `pnpm dev` em execução.
* Conta autenticada na interface.
* Alvos acessíveis (labs locais e/ou demos públicas) — ver tabela de preparação abaixo.

### Indicadores de referência (Essential v1.0, 24/07/2026)

| Aplicação | Perfil | Score | Achados | C/A/M/B | PDF |
|-----------|--------|------:|--------:|---------|-----|
| VAmPI | Lab. vulnerável | 25% | 18 | 4 / 9 / 5 / 0 | `secureforgeweb-vampi-2026-07-24.pdf` |
| OWASP WebGoat (Java) | Lab. vulnerável | 29% | 17 | 5 / 8 / 4 / 0 | `secureforgeweb-owasp-webgoatjava-2026-07-24.pdf` |
| OWASP NodeGoat | Lab. vulnerável | 33% | 16 | 4 / 8 / 3 / 1 | `secureforgeweb-owasp-nodegoat-2026-07-24.pdf` |
| OWASP WebGoat (PHP) | Lab. vulnerável | 33% | 16 | 5 / 6 / 5 / 0 | `secureforgeweb-owasp-webgoatphp-2026-07-24.pdf` |
| DVWA | Lab. vulnerável | 38% | 15 | 4 / 7 / 4 / 0 | `secureforgeweb-dvwa-2026-07-24.pdf` |
| OWASP Mutillidae II | Lab. vulnerável | 38% | 15 | 5 / 6 / 4 / 0 | `secureforgeweb-owasp-mutillidae-ii-2026-07-24.pdf` |
| Ghost CMS | Demo OSS | 42% | 14 | 3 / 7 / 4 / 0 | `secureforgeweb-ghost-cms-2026-07-24.pdf` |
| Gitea | Demo OSS | 42% | 14 | 3 / 7 / 3 / 1 | `secureforgeweb-gitea-2026-07-24.pdf` |
| OWASP Juice Shop | Lab. vulnerável | 46% | 13 | 4 / 6 / 3 / 0 | `secureforgeweb-owasp-juice-shop-2026-07-24.pdf` |
| Mattermost | Demo OSS | 58% | 10 | 3 / 5 / 1 / 1 | `secureforgeweb-mattermost-2026-07-24.pdf` |
| SecureForge Web | Autoavaliação | 63% | 9 | 1 / 4 / 4 / 0 | `secureforgeweb-secureforge-web-2026-07-24.pdf` |
| SecureForge Web v2 | Autoavaliação | **75%** | 6 | 1 / 2 / 3 / 0 | `secureforgeweb-secureforge-web-v2-2026-07-24.pdf` |

C/A/M/B = crítica / alta / média / baixa.

**Fórmula do score (plataforma):** `(conforme + N/A) / 24`. Itens N/A contam como positivos (mesma regra do dashboard/PDF).

**Matriz item-a-item (24×12):** [`resultados/MATRIZ_ESSENTIAL_2026-07-24.md`](secureforgeweb_web/resultados/MATRIZ_ESSENTIAL_2026-07-24.md) e CSV [`matriz-essential-2026-07-24.csv`](secureforgeweb_web/resultados/matriz-essential-2026-07-24.csv). **NC** vem dos PDFs; **C/NA** nos restantes itens foi reconstruída pelos autores (regras no ficheiro da matriz), com contagem N/A por alvo e validação do score.

### Preparação dos alvos (URLs / fontes)

| Alvo | URL no estudo (PDF) | Como preparar para repetir |
|------|---------------------|----------------------------|
| Ghost CMS | `https://demo.ghost.io/` | Usar a demo pública (pode mudar ao longo do tempo) |
| Gitea | `https://demo.gitea.com/` | Idem |
| Mattermost | `https://community.mattermost.com/landing#/` | Idem |
| SecureForge Web / v2 | `https://localhost:5173/` | Instância local (`pnpm dev`; TLS conforme README) |
| Juice Shop, DVWA, WebGoat (Java/PHP), NodeGoat, Mutillidae, VAmPI | *(URL local — não impressa no PDF)* | Labs **locais** via fontes oficiais (ver [PROTOCOLO_ESTUDO.md](secureforgeweb_web/resultados/PROTOCOLO_ESTUDO.md) §3.2). Ex.: Juice Shop `docker run --rm -p 3000:3000 bkimminich/juice-shop`. **Versões do dia 24/07 não foram pinadas.** |

### Protocolo de decisão e consenso (dois analistas)

1. Mesmo alvo, mesmo checklist Essential v1.0, mesmas evidências HTTP/Git/(IA opcional).
2. Cada analista classifica os 24 itens de forma **independente** (conforme / não conforme / parcial / N/A).
3. Divergências → discussão baseada na evidência observável até **consenso**; a classificação final é a consensual.
4. O LLM (`gpt-4o-mini`, opcional) **sugere**; **não** substitui o consenso humano.
5. Após consenso: concluir análise → gerar achados → exportar PDF (artefacto público por alvo).

A matriz pública C/NA/NC por item e alvo está em [`MATRIZ_ESSENTIAL_2026-07-24.md`](secureforgeweb_web/resultados/MATRIZ_ESSENTIAL_2026-07-24.md) (NC dos PDFs; C/NA reconstruídos). As fichas manuscritas originais do dia 24/07 **não** estão versionadas.
### Checklist Essential SecureForge v1.0 ↔ OWASP ASVS 5.0

Perfil de 24 itens / 9 categorias usado no estudo. Cada item aponta para **um** requisito ASVS 5.0.0 no formato canónico `v5.0.0-X.Y.Z` (o catálogo completo ASVS L1/Complete também está na ferramenta).

| Código | Categoria | Item | ASVS 5.0 |
|--------|-----------|------|----------|
| AUTH-01 | Autenticação | Política de senha mínima | `v5.0.0-6.2.1` |
| AUTH-02 | Autenticação | Hash de senha forte | `v5.0.0-11.4.2` |
| AUTH-03 | Autenticação | Proteção contra força bruta | `v5.0.0-6.3.1` |
| AUTH-04 | Autenticação | Expiração de sessão | `v5.0.0-7.1.1` |
| AUTHZ-01 | Autorização | Controle de acesso por perfil | `v5.0.0-8.2.1` |
| AUTHZ-02 | Autorização | Princípio do menor privilégio | `v5.0.0-8.2.2` |
| AUTHZ-03 | Autorização | Rotas administrativas protegidas | `v5.0.0-8.2.3` |
| INPUT-01 | Validação de entrada | Validação server-side | `v5.0.0-1.2.1` |
| INPUT-02 | Validação de entrada | Queries parametrizadas | `v5.0.0-1.2.4` |
| INPUT-03 | Validação de entrada | Sanitização anti-XSS | `v5.0.0-1.2.3` |
| SECRET-01 | Proteção de credenciais | Segredos em variáveis de ambiente | `v5.0.0-13.3.1` |
| SECRET-02 | Proteção de credenciais | Ausência de credenciais no repositório | `v5.0.0-13.3.2` |
| HEADER-01 | Headers | Content-Security-Policy | `v5.0.0-3.4.3` |
| HEADER-02 | Headers | Strict-Transport-Security | `v5.0.0-3.4.1` |
| HEADER-03 | Headers | X-Frame-Options / frame-ancestors | `v5.0.0-3.4.6` |
| HEADER-04 | Headers | X-Content-Type-Options | `v5.0.0-3.4.4` |
| EXPOS-01 | Exposição | APIs sensíveis autenticadas | `v5.0.0-4.2.1` |
| EXPOS-02 | Exposição | Documentação de API restrita | `v5.0.0-14.2.1` |
| ERROR-01 | Erros | Sem stack trace em produção | `v5.0.0-16.5.1` |
| ERROR-02 | Erros | Mensagens genéricas ao usuário | `v5.0.0-16.5.2` |
| DATA-01 | Dados | HTTPS/TLS em trânsito | `v5.0.0-12.2.1` |
| DATA-02 | Dados | Dados sensíveis fora de logs | `v5.0.0-17.1.1` |
| SURF-01 | Superfície | Portas e serviços desnecessários | `v5.0.0-1.1.1` |
| SURF-02 | Superfície | Dependências atualizadas | `v5.0.0-15.2.4` |

O Essential **não** substitui o ASVS completo: é um perfil operacional para times de baixa maturidade. A ferramenta também importa ASVS 5.0 Level 1 e Complete.

### Posicionamento face a ferramentas existentes

A SecureForge Web **não** é um scanner de vulnerabilidades nem um agregador de findings. Contribuição = **operacionalizar** checklist + evidência + decisão humana.

| Ferramenta | Papel típico | O que a SecureForge **não** substitui | O que é específico aqui |
|------------|--------------|----------------------------------------|-------------------------|
| OWASP ZAP / Burp / Probely | DAST / proxy | Crawling, payloads, CVEs | Checklist guiado com HITL |
| Semgrep | SAST | Regras profundas por linguagem | Heurísticas Git pontuais + evidência por item |
| DefectDojo / Faraday / Dradis | Gestão/agregação de achados | Ingestão multi-scanner, ASVS scoring maduro | Wizard item-a-item, sugestão ≠ decisão |
| SKF | Conhecimento / labs AppSec | Conteúdo educativo OWASP | Fluxo de avaliação + PDF de postura |

### Ambiente pronto (VM)

Não há OVA/VM pré-instalada. O atalho oficial (como na playlist) é PostgreSQL EDB local + `psql -f scripts/init-postgres.sql` + `pnpm db:setup` + `pnpm dev`, com instaladores no [pacote Drive](#pacote-de-instaladores-google-drive). Docker Compose é alternativa opcional. Uma imagem de VM fica como trabalho futuro (não cabe no prazo do camera-ready).

### Reivindicação 1 — Fluxo ponta a ponta

**Objetivo:** demonstrar cadastro → análise assistida → revisão humana → achados → PDF.

**Passos:** seguir o [Teste mínimo — Parte B](#parte-b--fluxo-funcional-na-ui-vídeo-05) com um alvo (ex.: Juice Shop local ou a própria SecureForge em `http://localhost:5173`).

**Resultado esperado:** PDF e dashboard coerentes com o checklist Essential; evidências HTTP/Git quando URL/repo estiverem cadastrados.

### Reivindicação 2 — Laboratórios vulneráveis vs demos OSS

**Objetivo:** scores baixos em labs intencionalmente inseguros (25%–46%) e faixa intermédia em demos públicas (42%–58%).

**Passos:**

1. Preparar alvos conforme a tabela de preparação (demos públicas **ou** labs locais via §3.2 do protocolo).
2. Para cada alvo: executar o [protocolo de decisão e consenso](#protocolo-de-decisão-e-consenso-dois-analistas) com Essential v1.0.
3. Exportar PDF e comparar score / nº de achados / C/A/M/B com a tabela e com o PDF homónimo em `resultados/`.

**Resultado esperado:** ordenação qualitativa **labs ≤ demos OSS ≤ autoavaliação endurecida**. Scores absolutos em demos online e labs sem versão pinada podem variar; os PDFs de 24/07/2026 são a referência fixa.

### Reivindicação 3 — Ciclo de hardening (autoavaliação)

**Objetivo:** ilustrar **63% → 75%** na SecureForge Web após hardening **parcial**.

**Passos:**

1. Avaliar `https://localhost:5173/` em estado de desenvolvimento habitual (baseline) → PDF com ~9 achados (ver lista no protocolo §6).
2. Aplicar remediações observáveis alinhadas aos itens que saíram do plano de ação entre os dois PDFs oficiais: **EXPOS-01**, **DATA-02**, **SURF-01** (detalhe em [PROTOCOLO_ESTUDO.md](secureforgeweb_web/resultados/PROTOCOLO_ESTUDO.md) §6).
3. Reavaliar com o mesmo checklist e consenso → comparar com `secureforgeweb-secureforge-web-v2-2026-07-24.pdf`.

**Delta documentado nos PDFs:** deixaram de aparecer como achados **EXPOS-01**, **DATA-02** e **SURF-01**. Permanecem abertos em ambos: DATA-01, HEADER-01..04, SURF-02.

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
| **02** | `02-instalacao-config-ferramentas.mp4` | 2–3 min | Instalar Git, Node 22, PostgreSQL EDB; ativar pnpm |
| **03** | `03-git-clone.mp4` | ~1 min | `git clone` do repositório oficial |
| **04** | `04-deps-env-banco.mp4` | ~5 min | `.env`, `init-postgres.sql` (EDB local), `pnpm install`, `pnpm db:setup` |
| **05** | `05-execucao-e-resultados.mp4` | 5–6 min | `pnpm dev` + cadastro, análise, dashboard e PDF |

**Duração total (01–05):** ~15–17 minutos.

### Comandos espelhados (Windows / PowerShell)

```powershell
# 03 — clone
git clone https://github.com/secureforgeweb/secureforgeweb.git
cd secureforgeweb\secureforgeweb_web

# 04 — deps e banco (caminho do vídeo: Postgres EDB local)
copy .env.example .env
# editar JWT_SECRET (>= 32 chars) e DATABASE_URL (user/senha do EDB + nome da base)
# alinhar scripts/init-postgres.sql à DATABASE_URL, depois:
psql -U postgres -f scripts/init-postgres.sql
pnpm install
pnpm db:setup
# alternativa opcional (não usada no vídeo 04): docker compose up -d

# 05 — execução
pnpm dev
# abrir http://localhost:5173
```

Chamada SBSeg SF: https://www.sbseg2026.uff.br/chamadas/sf/
