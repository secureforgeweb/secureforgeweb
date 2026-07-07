# Roteiro de Demonstração — SecureForge Web

Roteiro para apresentação acadêmica da **Entrega 3** (~18–22 minutos). Use uma aplicação de laboratório fictícia ou um repositório público real para as análises automáticas.

Relatório desta entrega: [RELATORIO.md](RELATORIO.md)

---

## Pré-requisitos

```powershell
# 1. Configure o .env (copie de .env.example)
#    DATABASE_URL, JWT_SECRET, FRONTEND_URL, VITE_API_PROXY_TARGET

# 2. Suba o banco, migrações e seed do checklist OWASP
pnpm db:setup

# 3. Inicie frontend + backend
pnpm dev
```

Acesse: **http://localhost:5173**

| Item | Detalhe |
|---|---|
| Conta demo | Crie em **Criar Conta** (ex.: `demo@secureforgeweb.local`) ou use usuário existente |
| Assistente IA (LLM) | Configure em **Perfil → Configurar Assistente IA** (chave e modelo **por usuário**, não no `.env`) |
| Conta admin | Necessária para a etapa de benchmark — promova um usuário em `/admin/users` |
| Análises automáticas | Exigem **URL base** e/ou **repositório Git** cadastrados na aplicação |

> **Entrega 3:** cada operador usa **seu próprio** provedor/modelo (OpenAI, Gemini, Azure ou custom). Vários usuários podem trabalhar simultaneamente com configurações diferentes.

---

## Cenário sugerido: Portal Acadêmico Lab

| Campo | Valor sugerido |
|---|---|
| Nome | Portal Acadêmico Lab |
| URL base | `https://portal-lab.universidade.edu` *(ou URL pública real para demo de headers)* |
| Repositório Git | `https://github.com/OWASP/NodeGoat` *(repositório público HTTPS para análise de código)* |
| Stack | React + Node.js + PostgreSQL |
| Descrição | Sistema de matrículas e notas para demonstração acadêmica |

> Pelo menos **URL base** ou **repositório Git** é obrigatório no cadastro — ideal preencher ambos para demonstrar todas as análises automáticas.

### Cenário multiusuário (benchmark — opcional, recomendado)

| Usuário | Modelo sugerido | Papel |
|---|---|---|
| Operador A | OpenAI — `gpt-4o-mini` | `user` |
| Operador B | Google Gemini — `gemini-2.0-flash` | `user` |
| Coordenador | — | `admin` |

Ambos analisam a **mesma URL base** (aplicações distintas ou mesma app, conforme o roteiro). O admin compara postura e modelos em **Análises globais**.

---

## Roteiro (18–22 min)

### 1. Landing e contexto (2 min)

- Abrir `/` — apresentar proposta **AppHardener**
- Destacar o fluxo consolidado: **config IA pessoal → aplicação → checklist → achados → postura → PDF**
- Fazer **login** e mostrar o menu: Dashboard, Aplicações, Postura de Segurança

### 2. Configurar assistente IA pessoal (2 min) — *novo na Entrega 3*

1. **Perfil** (menu do usuário) → **Configurar Assistente IA** (`/profile/ai-assistant`)
2. Selecionar provedor (ex.: **OpenAI** ou **Google Gemini**)
3. Informar **chave de API** e **modelo**
4. Clicar **Testar conexão** → **Salvar configuração**
5. Enfatizar: *“Esta configuração é só minha — outro usuário logado pode usar outro modelo.”*

> Sem chave configurada, o assistente usa **heurísticas locais**; com chave válida, usa **LLM** do provedor escolhido.

### 3. Cadastro da aplicação (2 min)

- **Aplicações → Nova Aplicação**
- Preencher dados do Portal Acadêmico Lab (incluindo URL e repositório Git)
- Salvar — abrir o **detalhe da aplicação**
- Mostrar atalhos: **Iniciar análise**, **Dashboard de postura**, **Exportar PDF**, **Ver achados**

### 4. Wizard de checklist e análises automáticas (7 min)

- Clicar em **Iniciar análise**
- Apresentar as **9 categorias OWASP** (24 itens) e a barra de progresso geral

#### 4.1 Análises por categoria (independentes)

| Botão | Quando aparece | O que faz |
|---|---|---|
| **Analisar headers HTTP** | Categoria com itens de headers/HTTPS | Pré-preenche via fetch passivo da URL base |
| **Analisar repositório Git** | Categoria com itens de código (AUTH, INPUT, etc.) | Pré-preenche via clone + heurísticas estáticas |
| **Assistente IA (categoria)** | Sempre (se houver URL ou repo) | Usa o **modelo cadastrado pelo usuário logado** |

**Demonstrar ao vivo:**

1. **Headers de segurança** → **Analisar headers HTTP** → revisar sugestões com badge de confiança
2. **Validação de entrada** → **Analisar repositório Git** → sugestão automática (ex.: INPUT-02)
3. **Exposição de endpoints** → **Assistente IA (categoria)** → badge roxo **Sugestão IA**

#### 4.2 Assistente IA por item

- Em um item (ex.: `AUTH-02`), clicar **Assistente IA** no card
- Explicar execução **isolada por item**, sem afetar os demais

#### 4.3 Revisão humana e salvamento

- Enfatizar: *“A sugestão não substitui validação humana — o analista confirma ou ajusta.”*
- Ajustar manualmente 2–3 itens (ex.: AUTH-02 não conforme, HEADER-01 parcial)
- **Salvar categoria** → trocar de aba (auto-save) → **Salvar e continuar**
- **Concluir e gerar achados**

### 5. Achados e hardening (2 min)

- Lista de **achados** da aplicação — filtrar por severidade
- Abrir achado crítico/alto — recomendação e evidência
- Alterar status para **Em correção** — notificação no sino (se crítico)

### 6. Dashboard e PDF (2 min)

- **Dashboard de postura** (`/applications/:id/dashboard`) — score e gráficos
- **Exportar PDF** — mostrar resumo executivo no arquivo baixado

### 7. Admin — análises globais e benchmark (3–4 min) — *Entrega 3*

*Requer perfil **admin**. Ideal após dois operadores terem concluído análises.*

1. **Painel Admin** → **Análises globais** (`/admin/analyses`)
2. Mostrar tabela com **todas as análises** (executor, aplicação, **Modelo IA**, postura, status)
3. **Filtrar** por coluna (ex.: nome do executor ou modelo)
4. **Redimensionar colunas** arrastando a borda do cabeçalho
5. Marcar **2 ou mais** análises (checkbox) → **Comparar**
6. Exibir **gráfico de barras** com postura (%) por análise
7. Se houver mesma URL base em apps distintas, destacar seção **Benchmark — mesma URL base**

> Evidência para banca: coluna **Modelo IA** com `OpenAI (GPT) (gpt-4o-mini)` vs `Google Gemini (gemini-2.0-flash)`.

### 8. Encerramento (1 min)

- Reforçar: fluxo principal funcional, multiusuário, revisão humana, OWASP/ASVS
- Mencionar admin: usuários, checklist OWASP, análises globais
- Referência: [RELATORIO.md](RELATORIO.md)

---

## Itens para destacar na banca

1. **Fluxo principal consolidado** ponta a ponta (Entrega 3)
2. Checklist OWASP v1.0 — **24 itens / 9 categorias**
3. **Assistente IA por usuário** — OpenAI, Gemini, Azure, custom
4. Análises automáticas: HTTP, Git e IA **por categoria e por item**
5. Salvamento parcial e navegação livre no wizard
6. Achados, recomendações e **score de postura**
7. **Relatório PDF** exportável
8. **Admin:** visão global, filtro por coluna, **comparativo gráfico** entre análises/modelos
9. Segurança da plataforma (bcrypt, RBAC, isolamento por usuário)

---

## Roteiro alternativo (demo rápida — 10 min)

1. Login → **Configurar Assistente IA** no perfil (1 min)
2. Cadastrar aplicação com URL + repo (1 min)
3. Wizard: 1 Git + 1 IA por categoria + revisão (3 min)
4. Concluir → achados (1 min)
5. Dashboard + PDF (2 min)
6. *(Admin)* Análises globais → selecionar 2 linhas → Comparar (2 min)

---

## Roteiro benchmark multiusuário (complementar — 5 min)

1. Operador A: config OpenAI → análise completa → anotar postura %
2. Operador B: config Gemini → mesma URL base → análise completa
3. Admin: **Análises globais** → filtrar → comparar gráfico
4. Print ou gravação da tela para evidência AVA

---

## Checklist pré-demo

- [ ] PostgreSQL rodando e `DATABASE_URL` no `.env`
- [ ] `pnpm db:setup` executado (migrações até `0016`, checklist 24 itens)
- [ ] `pnpm dev` ativo (frontend :5173, backend :3000)
- [ ] Conta operador criada e login testado
- [ ] **Assistente IA configurado no Perfil** (chave + teste de conexão)
- [ ] *(Benchmark)* Segunda conta + conta **admin**
- [ ] Aplicação demo com **URL base** e **repositório Git** público
- [ ] Análise concluída ao menos uma vez (para score e PDF)
- [ ] *(Admin)* Tela `/admin/analyses` e gráfico comparativo testados
- [ ] Download de PDF testado antes da apresentação

---

## Solução de problemas durante a demo

| Situação | Ação |
|---|---|
| Botões de análise desabilitados | Cadastre URL base e/ou repositório Git na aplicação |
| Clone Git falha | Use repositório **público HTTPS** |
| Assistente IA sem respostas LLM | Configure chave em **Perfil → Assistente IA**; teste conexão |
| HTTP 429 no teste de conexão | Conta sem crédito — troque provedor (ex.: Gemini) ou use heurístico |
| Coluna Modelo IA com "Não configurado" | Usuário ainda não salvou config em `/profile/ai-assistant` |
| Gráfico comparativo vazio | Selecione **2+** análises com checkbox → **Comparar** |
| Score aparece como "—" | Conclua análise com **todos** os 24 itens respondidos |
| PDF não baixa | Verifique permissões de download do navegador |
| Admin não vê todas as apps | Confirme papel `admin` em `/admin/users` |

Apresentação em slides: [APRESENTACAO.md](APRESENTACAO.md) · Manual completo: [MANUAL.md](MANUAL.md) · Relatório: [RELATORIO.md](RELATORIO.md)
