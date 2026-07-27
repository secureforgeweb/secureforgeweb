# SecureForge Web — Playlist de demonstração (vídeos)

**Produto:** SecureForge Web  
**Modalidade SBSeg 2026:** Código Aberto (Salão de Ferramentas)  
**Código:** https://github.com/secureforgeweb/secureforgeweb  
**Pasta Drive (vídeos):** https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link  
**Pasta Drive (instaladores):** https://drive.google.com/drive/folders/1TaGlQJnZbYwSjW1J5YGOxmcllMaqsjJV?usp=sharing  

> Use este ficheiro como **README da pasta Drive** (copie-o para a pasta dos vídeos).  
> Acesso recomendado: *qualquer pessoa com o link* (leitura).

---

## Fluxo da playlist (ordem real)

A demonstração segue o caminho de quem chega **do zero** até um **ciclo completo** na ferramenta:

1. **Descarregar** as ferramentas necessárias (sites oficiais **ou** pasta Drive de instaladores)  
2. **Instalar e configurar** essas ferramentas  
3. **Clonar** o projeto SecureForge Web  
4. **Dependências + configuração local** (pnpm, `.env`, banco)  
5. **Executar** a aplicação e **gerar resultados** (teste ponta a ponta)

| # | Ficheiro sugerido | Duração alvo | Etapa |
|---|---|---|---|
| **01** | `01-download-ferramentas.mp4` | ~2 min | Mostrar a [pasta instaladores](https://drive.google.com/drive/folders/1TaGlQJnZbYwSjW1J5YGOxmcllMaqsjJV?usp=sharing) (e/ou sites oficiais): Git, Node.js 22, PostgreSQL; browser |
| **02** | `02-instalacao-config-ferramentas.mp4` | 2–3 min | Instalar Git + Node 22 + PostgreSQL (ou Docker), ativar Corepack/pnpm, validar `git` / `node` / `pnpm` |
| **03** | `03-git-clone.mp4` | ~1 min | `git clone` do repositório oficial e entrar em `secureforgeweb_web` |
| **04** | `04-deps-env-banco.mp4` | ~5 min | `.env`, `pnpm install`, `pnpm db:setup` (migrate + seed Essential + ASVS) |
| **05** | `05-execucao-e-resultados.mp4` | 5–6 min | `pnpm dev` + ciclo completo na UI até PDF/dashboard (ver roteiro abaixo) |

**Opcional (só se couber no tempo):**

| # | Ficheiro | Duração | Conteúdo |
|---|---|---|---|
| **00** | `00-visao-geral.mp4` | ~90 s | O que é a SecureForge Web (antes do download) |
| **06** | `06-https-local.mp4` | ~2 min | `pnpm https:setup` e análise em `https://localhost:3000` |

**Duração total alvo (01–05):** ~12–15 minutos.

### Pacote de instaladores (vídeos 01–02)

Espelho Windows na pasta Drive (preferir sites oficiais quando possível):

| Arquivo | Uso na SecureForge Web |
|---|---|
| `Git-2.55.0.3-64-bit.exe` | Obrigatório — clonar o repositório |
| `node-v22.23.1-x64.msi` | Obrigatório — runtime + Corepack → pnpm |
| `postgresql-18.4-2-windows-x64.exe` | Obrigatório *ou* Docker — BD (EDB 18 atende o requisito 16+) |
| `VSCodeUserSetup-x64-1.130.0.exe` | Opcional — editor |
| `git-lfs-windows-v3.7.1.exe` | **Ignorar** — a SecureForge Web **não** usa Git LFS |

Link: https://drive.google.com/drive/folders/1TaGlQJnZbYwSjW1J5YGOxmcllMaqsjJV?usp=sharing

### Material auxiliar já gerado (slides + legendas PT)

Pasta local (não vai para o GitHub): `docs/_videos_demo/`

| Artefacto | Conteúdo |
|---|---|
| `01-download-ferramentas.mp4` + `.srt` + `.roteiro.md` | Slides SecureForge + pasta instaladores Drive |
| `02-instalacao-config-ferramentas.mp4` + `.srt` + `.roteiro.md` | Instalação/config (sem Git LFS) |

> Estes MP4 **não substituem** gravação de ecrã real (Drive + instaladores). Use o `.roteiro.md` e o `.srt` ao gravar no CapCut/OBS e envie o resultado final para a pasta de **vídeos**.

Regenerar: `python secureforgeweb_web/scripts/_gen_demo_videos_01_02.py`

---

## Comandos espelhados (Windows / PowerShell)

### 01 — Download das ferramentas

Abrir a pasta Drive de instaladores e/ou os sites oficiais (sem instalar ainda):

| Ferramenta | Objetivo | Fonte |
|---|---|---|
| **Git** | Clonar o repositório | Drive: `Git-*-64-bit.exe` · [git-scm.com](https://git-scm.com/download/win) |
| **Node.js 22 LTS** | Runtime (+ Corepack → pnpm) | Drive: `node-v22.*-x64.msi` · [nodejs.org](https://nodejs.org/) |
| **PostgreSQL 16+** *ou* **Docker** | Banco de dados | Drive: `postgresql-*-windows-x64.exe` (EDB 18) · ou Docker Desktop |
| **VS Code** (opcional) | Editor | Drive: `VSCodeUserSetup-*.exe` |
| **Browser** | UI em `localhost:5173` | Chrome / Edge / Firefox |
| **Git LFS** | — | **Não descarregar para este projeto** |

### 02 — Instalação e configuração das ferramentas

```powershell
# Após instalar Git e Node 22 (instaladores do Drive ou oficiais):
git --version
node -v          # deve mostrar v22.x

# pnpm via Corepack (Windows: de preferência terminal como Administrador)
corepack enable
corepack prepare pnpm@latest --activate
pnpm -v

# PostgreSQL: concluir o instalador EDB (serviço na porta 5432)
#   OU Docker Desktop a correr; o compose sobe no vídeo 04:
# docker compose up -d
```

Confirmar PostgreSQL a escutar (serviço local **ou** container) antes do vídeo 04.  
**Não** é necessário instalar Git LFS para a SecureForge Web.

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

**Resultados:** mostre o ciclo completo com os alvos que a equipa **já analisou**. O importante é evidenciar:

- progresso do checklist  
- score de postura  
- achados gerados  
- evidências / PDF  

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
- [ ] Vídeos 01–02 usam pasta **instaladores** SecureForge (não misturar UI/nome FluxTrace)  
- [ ] **Não** apresentar Git LFS como requisito  
- [ ] 1080p, áudio claro em português  
- [ ] Comandos legíveis (fonte grande ou legenda)  
- [ ] **Sem** segredos reais / chaves de LLM na tela  
- [ ] Ficheiros `01`…`05` (e `00`/`06` se existirem) na pasta de **vídeos**  
- [ ] Pastas Drive (vídeos + instaladores) com permissão de leitura por link  
- [ ] Este README colado na pasta Drive dos vídeos junto com os MP4  

---

## Documentação relacionada

| Documento | Onde |
|-----------|------|
| Manual do usuário | [MANUAL.md](MANUAL.md) |
| Arquitetura | [PROJETO_ARQUITETURAL.md](PROJETO_ARQUITETURAL.md) |
| Diagrama | [screenshots/arquitetura.png](screenshots/arquitetura.png) |
| Ops (env, scripts) | [readme-web.md](../readme-web.md) |
| README do repositório | [README.md](../../README.md) |
| Resultados (PDFs) | [`../resultados/`](../resultados/) |
| Instaladores (Drive) | https://drive.google.com/drive/folders/1TaGlQJnZbYwSjW1J5YGOxmcllMaqsjJV?usp=sharing |

**Licença:** MIT  
**SBSeg 2026:** https://www.sbseg2026.uff.br/chamadas/sf/
