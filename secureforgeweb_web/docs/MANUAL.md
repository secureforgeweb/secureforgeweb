# Manual de Uso — SecureForge Web

Plataforma de diagnóstico e hardening de aplicações web (AppHardener).

Documentação da entrega atual: [RELATORIO.md](RELATORIO.md)

---

## 1. Acesso ao sistema

1. Acesse a URL do frontend (ex.: http://localhost:5173)
2. No canto superior, escolha **PT** ou **EN** (disponível também antes do login)
3. Clique em **Criar Conta** ou **Entrar**
4. Após login, você será redirecionado ao **Dashboard**

### Idioma e interface

| Recurso | Onde |
|---|---|
| **Idioma PT/EN** | Home, Login, Registro e header autenticado |
| **Tema claro/escuro** | Ícone de sol/lua no header |
| **Menu lateral** | Botão no header ou atalho **Ctrl+B** (expandir/recolher) |

Mensagens de erro da API (validação, login, admin) respeitam o idioma selecionado.

---

## 2. Configurar o assistente IA (por usuário)

Cada usuário possui **configuração independente** de LLM. Não é compartilhada com outros operadores.

1. Menu do usuário → **Perfil** (`/profile`)
2. Clique em **Configurar Assistente IA** (`/profile/ai-assistant`)
3. Preencha:
   - **Provedor** — OpenAI, Google Gemini, Microsoft Copilot (Azure) ou compatível OpenAI (custom)
   - **URL base da API** — preenchida automaticamente pelo preset (ajuste se necessário)
   - **Modelo** — ex.: `gpt-4o-mini`, `gemini-2.0-flash`
   - **Chave de API** — do provedor escolhido
4. Ative **Habilitar assistente IA (LLM)** se desejar usar o modelo remoto
5. Use **Testar conexão** antes de salvar
6. Clique em **Salvar configuração**

| Modo | Condição |
|---|---|
| **LLM** | Chave válida + assistente habilitado |
| **Heurístico** | Sem chave, assistente desabilitado ou falha/quota da API |

> O assistente IA nas análises usa **sempre a config do usuário logado** que executa a análise.

---

## 3. Cadastrar uma aplicação

1. Menu **Aplicações** → **Nova Aplicação**
2. Preencha:
   - **Nome** (obrigatório)
   - **URL base** (ex.: `https://app.exemplo.com`)
   - **Repositório Git** (ex.: `https://github.com/org/projeto` — repositório público HTTPS)
   - **Stack tecnológica** (opcional)
   - **Descrição** (opcional)
3. **Pelo menos URL base ou repositório Git** deve ser informado
4. Salve — a aplicação aparecerá na lista

**Perfil admin:** em **Aplicações**, a lista exibe **todas** as aplicações do sistema, com o e-mail do dono.

---

## 4. Executar análise de checklist

1. Abra o detalhe da aplicação
2. Clique em **Iniciar análise** (ou **Continuar análise**)
3. Se disponível, escolha o **checklist** na criação da análise:
   - **Checklist Essential SecureForge** (v1.0) — 24 itens em 9 categorias (avaliação rápida)
   - **OWASP ASVS 5.0 — Level 1** — subconjunto L1
   - **OWASP ASVS 5.0 — Complete** — catálogo completo (~345 requisitos)
4. No wizard, navegue pelas categorias/capítulos
5. Para checklists **ASVS**, use **busca** e filtro por **nível** (L1/L2/L3)
6. Para cada item, selecione a conformidade:
   - Conforme
   - Parcialmente conforme
   - Não conforme
   - Não aplicável
7. Adicione observações quando relevante

### Salvamento e navegação

| Ação | Comportamento |
|---|---|
| **Salvar categoria** | Persiste respostas parciais ou completas |
| **Salvar e continuar** | Exige categoria completa e avança |
| **Trocar de aba** | Auto-save da categoria atual |
| **Anterior** | Volta com salvamento automático |

8. Após todas as categorias, clique em **Concluir e gerar achados**

O histórico de análises no detalhe da aplicação mostra **quem executou** e o **modelo IA** configurado (quando aplicável).

---

## 5. Análises automáticas assistidas

As análises **sugerem** conformidade. O analista **deve revisar** antes de salvar.

### Por categoria

| Botão | Quando aparece | O que analisa |
|---|---|---|
| **Analisar headers HTTP** | Itens de headers/HTTPS | Fetch passivo da URL base |
| **Analisar repositório Git** | Itens de código | Clone + heurísticas estáticas |
| **Assistente IA (categoria)** | URL ou repo cadastrado | Itens da categoria com o **seu** modelo IA |

### Por item

Botão **Assistente IA** em cada card — analisa **apenas aquele item**.

### Sugestões automáticas

- Badge **Sugestão automática** (cyan): HTTP ou Git
- Badge **Sugestão IA** (roxo): assistente IA
- Exibem confiança, evidência e raciocínio
- Edição manual remove a sugestão visual do item

Cada execução automática é registrada no servidor (escopo, modo, modelo) para auditoria e benchmark admin.

---

## 6. Gerenciar achados

1. No detalhe da aplicação → **Ver achados**
2. Filtros por severidade, status e categoria
3. Abra um achado para ver recomendação, evidência e histórico
4. Atualize status: **Aberto** → **Em correção** → **Resolvido** (ou **Aceito risco**)

Achados críticos geram notificação in-app (ícone de sino).

---

## 7. Dashboard de postura

### Visão global (`/dashboard` ou `/posture`)

- Score médio de postura
- Total de achados abertos
- Gráficos consolidados
- Lista de aplicações com **Exportar PDF**

### Por aplicação (`/applications/:id/dashboard`)

- Score da última análise concluída
- Gráficos por severidade e categoria
- Taxa de resolução
- Histórico de análises
- **Exportar PDF**

---

## 8. Relatório PDF

Exportação disponível em:

- **Dashboard global** — por aplicação na lista
- **Detalhe da aplicação** — botão **Exportar PDF**
- **Dashboard da aplicação** — botão **Exportar PDF**

Conteúdo: resumo executivo, severidade, plano de ação priorizado.

---

## 9. Administração (perfil admin)

| Função | Caminho |
|---|---|
| Painel administrativo | `/admin` |
| Gerenciar usuários e papéis | `/admin/users` |
| Itens de checklist (Essential + ASVS) | `/admin/checklist-items` |
| **Análises globais e benchmark** | `/admin/analyses` |
| Configurar **seu** assistente IA | `/profile/ai-assistant` |

### Itens de checklist (`/admin/checklist-items`)

| Recurso | Uso |
|---|---|
| Seletor de checklist | Essential v1.0, ASVS L1 ou ASVS Complete |
| **Sync ASVS** | Atualiza catálogos ASVS a partir da fonte OWASP |
| Busca | ID, título, texto do requisito, ref., auto |
| Filtros | Nível ASVS e severidade sugerida |
| Navegação por capítulo | Sidebar esquerda — clique para ir ao capítulo |
| Tabela compacta | Colunas redimensionáveis (arraste a borda do cabeçalho) |
| Editar severidade | Botão **Editar** por item |

Preferências de largura das colunas são salvas no navegador (`localStorage`).

### Análises globais (`/admin/analyses`)

Visão de **todas as análises de todos os usuários**:

| Recurso | Uso |
|---|---|
| Tabela completa | Executor, aplicação, dono, **modelo IA**, postura, status |
| Filtro por aplicação / URL | Barra superior |
| Filtro por coluna | Campos abaixo de cada cabeçalho |
| Redimensionar colunas | Arrastar borda direita do cabeçalho (preferência salva localmente) |
| Seleção múltipla | Checkbox em cada linha |
| **Comparar** | Com 2+ selecionadas — gráfico de postura (%) |
| Benchmark automático | Agrupa análises com a **mesma URL base** |

A coluna **Modelo IA** exibe o modelo **cadastrado pelo usuário que executou** a análise (ex.: `Google Gemini (gemini-2.0-flash)`).

---

## 10. Papéis de usuário

| Papel | Permissões |
|---|---|
| **user** | Suas aplicações, análises, achados, relatórios e config IA pessoal |
| **security-analyst** | Igual ao `user` (extensível em versões futuras) |
| **admin** | Todas as aplicações e análises + painel admin + benchmark global |

Admin pode abrir análises e aplicações de outros usuários (somente leitura operacional no fluxo de análise).

---

## 11. Solução de problemas

| Problema | Ação |
|---|---|
| API não responde | Verifique `pnpm dev` e `DATABASE_URL` no `.env` |
| Checklist vazio | Execute `pnpm db:setup` (seed + import ASVS) |
| ASVS desatualizado | Admin → Checklist Items → **Sync ASVS** ou `pnpm db:sync-asvs` |
| Botões de análise desabilitados | Cadastre URL base e/ou repositório Git |
| Clone Git falha | Use repositório **público HTTPS** |
| Assistente IA sem LLM | Configure em **Perfil → Assistente IA**; teste a conexão |
| Erro HTTP 429 no teste | Cota excedida — adicione créditos ou troque provedor |
| Modelo IA "Não configurado" | Salve config em `/profile/ai-assistant` |
| Gráfico comparativo não aparece | Selecione 2+ análises → botão **Comparar** |
| Score "—" | Conclua análise com todos os itens do checklist escolhido |
| PDF não baixa | Permissões de download do navegador |

---

## 12. Documentação relacionada

| Documento | Conteúdo |
|---|---|
| [RELATORIO.md](RELATORIO.md) | Relatório técnico consolidado |
| [PROJETO_ARQUITETURAL.md](PROJETO_ARQUITETURAL.md) | Arquitetura alvo e requisitos |
