# SecureForge Web — Playlist de demonstração (vídeos)

**Produto:** SecureForge Web  
**Modalidade SBSeg 2026:** Código Aberto (Salão de Ferramentas)  
**Código:** https://github.com/secureforgeweb/secureforgeweb  
**Pasta Drive (vídeos):** https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link  

> Use este ficheiro como **README da pasta Drive** (copie-o para a pasta dos vídeos).  
> Acesso recomendado: *qualquer pessoa com o link* (leitura).

---

## Fluxo da playlist (ordem real)

A demonstração segue o caminho de quem chega **do zero** até um **ciclo completo** na ferramenta:

1. **Descarregar** as ferramentas necessárias  
2. **Instalar e configurar** essas ferramentas  
3. **Clonar** o projeto SecureForge Web  
4. **Dependências + configuração local** (pnpm, `.env`, banco)  
5. **Executar** a aplicação e **gerar resultados** (teste ponta a ponta)

| # | Ficheiro sugerido | Duração alvo | Etapa |
|---|---|---|---|
| **01** | `01-download-ferramentas.mp4` | ~2 min | Onde obter Git, Node.js 22, pnpm/Corepack, PostgreSQL **ou** Docker, browser |
| **02** | `02-instalacao-config-ferramentas.mp4` | 2–3 min | Instalar, ativar Corepack/pnpm, subir PostgreSQL (local ou `docker compose`), validar `git` / `node` / `pnpm` |
| **03** | `03-git-clone.mp4` | ~1 min | `git clone` do repositório oficial e entrar em `secureforgeweb_web` |
| **04** | `04-deps-env-banco.mp4` | 2–3 min | `.env`, `pnpm install`, `pnpm db:setup` (migrate + seed Essential + ASVS) |
| **05** | `05-execucao-e-resultados.mp4` | 4–6 min | `pnpm dev` + ciclo completo na UI até PDF/dashboard (ver roteiro abaixo) |

**Opcional (só se couber no tempo):**

| # | Ficheiro | Duração | Conteúdo |
|---|---|---|---|
| **00** | `00-visao-geral.mp4` | ~90 s | O que é a SecureForge Web (antes do download) |
| **06** | `06-https-local.mp4` | ~2 min | `pnpm https:setup` e análise em `https://localhost:3000` |

**Duração total alvo (01–05):** ~12–15 minutos.

---

## Comandos espelhados (Windows / PowerShell)

### 01 — Download das ferramentas

Mostrar (sem instalar ainda) as páginas / instaladores:

| Ferramenta | Objetivo |
|---|---|
| **Git** | Clonar o repositório |
| **Node.js 22 LTS** | Runtime da aplicação (inclui Corepack) |
| **pnpm** | Via Corepack (recomendado) ou instalador standalone |
| **PostgreSQL 16+** *ou* **Docker Desktop** | Banco de dados |
| **Browser** | Chrome / Edge / Firefox recente |

### 02 — Instalação e configuração das ferramentas

```powershell
# Após instalar Git e Node 22:
git --version
node -v          # deve mostrar v22.x

# pnpm via Corepack (Windows: de preferência terminal como Administrador)
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v

# Se usar Docker para o Postgres (na pasta do projeto, no vídeo 04):
# docker compose up -d
```

Confirmar PostgreSQL a escutar (serviço local **ou** container) antes do vídeo 04.

### 03 — Clone do projeto

```powershell
git clone https://github.com/secureforgeweb/secureforgeweb.git
cd secureforgeweb\secureforgeweb_web
```

### 04 — Dependências e configuração local

```powershell
copy .env.example .env
# Editar .env: DATABASE_URL e JWT_SECRET (>= 32 caracteres)

# Se Docker Compose estiver no projeto:
docker compose up -d

pnpm install
pnpm db:setup    # wait Postgres + migrate + seed Essential v1.0 + import ASVS 5.0
```

Exemplo mínimo no `.env` (desenvolvimento — **não** use segredos reais na gravação):

```env
DATABASE_URL=postgresql://secureforgeweb_user:secureforgeweb_pass@localhost:5432/secureforgeweb
JWT_SECRET=sua_chave_secreta_com_pelo_menos_32_caracteres_aleatorios
PORT=3000
FRONTEND_URL=http://localhost:5173
VITE_API_PROXY_TARGET=http://localhost:3000
```

### 05 — Execução e resultados (ciclo ponta a ponta)

```powershell
pnpm dev
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API (tRPC) | http://localhost:3000/api/trpc |
| Health | http://localhost:3000/api/health |

**Roteiro na UI (gravar em sequência):**

1. Abrir o frontend e criar conta / entrar  
2. (Opcional) Perfil → Assistente IA → testar conexão  
3. Cadastrar **uma ou mais** aplicações-alvo (URL e/ou repositório Git)  
4. Iniciar análise com checklist Essential v1.0 (ou ASVS, se quiser mostrar catálogo)  
5. Percorrer o wizard: sugestões HTTP/Git/IA + confirmação humana  
6. Concluir → gerar achados  
7. Dashboard de postura + lista de achados (severidade, status)  
8. Exportar PDF  

**Resultados:** mostre o ciclo completo com os alvos que a equipa **já analisou** (não precisa limitar a Juice Shop e SecureForge). O importante é evidenciar:

- progresso do checklist  
- score de postura  
- achados gerados  
- evidências / PDF  

Se houver vários alvos, um comparativo rápido no dashboard (ou dois PDFs) reforça a demonstração.

### 06 — HTTPS local (opcional)

```powershell
pnpm https:setup
# No .env: VITE_DEV_HTTPS=1, HTTPS_CERT, HTTPS_KEY, ENABLE_SECURE_HEADERS=1,
# FRONTEND_URL=https://localhost:5173
pnpm dev
```

Para headers (CSP/HSTS), preferir cadastrar a app como **`https://localhost:3000`**.

---

## Checklist de gravação

- [ ] Ordem fixa: download → install ferramentas → clone → deps/env/banco → execução/resultados  
- [ ] 1080p, áudio claro em português  
- [ ] Comandos legíveis (fonte grande ou legenda)  
- [ ] **Sem** segredos reais / chaves de LLM na tela  
- [ ] Ficheiros `01`…`05` (e `00`/`06` se existirem) para ordenar no Drive  
- [ ] Pasta Drive com permissão de leitura por link  
- [ ] Este README colado na pasta Drive junto com os MP4  

---

## Documentação relacionada

| Documento | Onde |
|-----------|------|
| Manual do usuário | [MANUAL.md](MANUAL.md) |
| Arquitetura | [PROJETO_ARQUITETURAL.md](PROJETO_ARQUITETURAL.md) |
| Diagrama | [screenshots/arquitetura.png](screenshots/arquitetura.png) |
| Ops (env, scripts) | [readme-web.md](../readme-web.md) |
| README do repositório | [README.md](../../README.md) |

**Licença:** MIT  
**SBSeg 2026:** https://www.sbseg2026.uff.br/chamadas/sf/
