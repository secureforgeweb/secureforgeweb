# Apresentação — SecureForge Web

Roteiro de slides para entrega acadêmica (AppHardener).  
Alinhado à **Entrega 3** — fluxo principal consolidado.

Demonstração ao vivo: [DEMO.md](DEMO.md) · Relatório: [RELATORIO.md](RELATORIO.md)

---

## Slide 1 — Capa

**SecureForge Web**  
Diagnóstico e Hardening de Aplicações Web  
Projeto Integrador · Segurança Aplicada · AppHardener  
**Entrega 3** — Fluxo principal consolidado

---

## Slide 2 — Problema

- Equipes pequenas não possuem fluxo estruturado para revisar postura de segurança
- Scanners automatizados geram ruído sem orientação à correção
- Falta rastreabilidade entre checklist, achados e plano de ação
- Dificuldade em comparar resultados entre analistas e ferramentas

---

## Slide 3 — Solução

Assistente guiado que conecta:

```
Config IA pessoal → Aplicação → Checklist OWASP → Achados → Dashboard → PDF
                              ↘ Admin: benchmark entre análises
```

---

## Slide 4 — Escopo funcional

| RF | Entrega |
|---|---|
| RF01 | Cadastro de aplicações (URL e/ou repositório Git) |
| RF02 | Checklist OWASP v1.0 (24 itens) |
| RF03–RF05 | Achados, severidade, recomendações |
| RF06–RF07 | Dashboard + relatório PDF |
| RF08 | Fluxo de status dos achados |
| Extra | Análises automáticas (HTTP, Git, IA) |
| **E3** | IA por usuário + admin benchmark global |

---

## Slide 5 — Arquitetura

- **Frontend:** React 19 + Vite + tRPC client
- **Backend:** Express + tRPC + Drizzle ORM
- **Banco:** PostgreSQL 16 (migrações `0010`–`0016`)
- **PDF:** PDFKit
- **IA:** Config por usuário (`user_ai_assistant_configs`) — OpenAI, Gemini, Azure, custom
- **Auditoria:** `analysis_assessment_runs` — registro de execuções automáticas

---

## Slide 6 — Checklist OWASP

9 categorias · 24 controles · seed versionado v1.0

Autenticação · Autorização · Validação · Segredos · Headers · Exposição · Erros · Dados · Superfície

---

## Slide 7 — Assistente IA por usuário (Entrega 3)

| Aspecto | Comportamento |
|---|---|
| Configuração | **Perfil → Configurar Assistente IA** |
| Isolamento | Cada usuário com provedor/modelo/chave próprios |
| Provedores | OpenAI, Gemini, Azure OpenAI, compatível OpenAI |
| Modos | LLM (com chave) ou heurístico local (fallback) |
| Execução | Usa sempre a config do **usuário logado** |

---

## Slide 8 — Análises automáticas assistidas

Três modalidades, **por categoria** ou **por item**:

| Modalidade | Evidência |
|---|---|
| Headers HTTP | Fetch passivo da URL base |
| Repositório Git | Clone + heurísticas de código |
| Assistente IA | Contexto HTTP + Git + LLM/heurístico do usuário |

Princípio: a automação **sugere**, o analista **valida**.

---

## Slide 9 — Fluxo de análise

1. Configurar assistente IA no perfil (opcional)
2. Cadastrar aplicação (URL e/ou repo Git)
3. Wizard — análises automáticas por categoria/item
4. Salvamento parcial e navegação livre
5. Conclusão → achados automáticos
6. Dashboard + exportar PDF

---

## Slide 10 — Dashboard de postura

- **Score:** % itens conformes + N/A
- **Gráficos:** severidade e categoria (Recharts)
- **Taxa de resolução**
- **Histórico** de análises
- **PDF** exportável

---

## Slide 11 — Admin: análises globais e benchmark (Entrega 3)

- Visão de **todas as análises** de **todos os usuários**
- Coluna **Modelo IA** (ex.: GPT-4o mini vs Gemini)
- Filtros por coluna · colunas redimensionáveis
- Seleção múltipla → **gráfico comparativo de postura**
- Benchmark automático por mesma URL base

Rota: `/admin/analyses`

---

## Slide 12 — Relatório PDF

- Identificação da aplicação
- Resumo executivo (score, achados, resolução)
- Plano de ação priorizado
- Tema claro padronizado

---

## Slide 13 — Segurança da plataforma

- bcrypt (12 rounds) · JWT HttpOnly · Rate limiting
- CORS + Helmet · Proteção IDOR (404)
- RBAC · Isolamento de dados por usuário
- Config de IA armazenada por usuário no PostgreSQL

---

## Slide 14 — Evolução Entrega 2 → 3

| Entrega 2 | Entrega 3 |
|---|---|
| Base estrutural mínima | **Núcleo funcional consolidado** |
| IA global (`.env`) | **IA por usuário** |
| Admin básico | **Benchmark global** |
| — | Registro de execuções automáticas |

---

## Slide 15 — Demo ao vivo

Seguir [DEMO.md](DEMO.md) — Portal Acadêmico Lab (~18–22 min)

**Destaques:** config IA no perfil · wizard · achados · PDF · admin comparativo

**Cenário multiusuário:** dois operadores, modelos diferentes, admin compara gráfico.

---

## Slide 16 — Conclusão

- Fluxo principal **funcional ponta a ponta**
- Multiusuário com IA personalizada
- Governança admin e benchmark visual
- Próximos passos: vídeo demo, CI/CD, metadados IA no banco, entrega final

**Repositório:** https://github.com/secureforgeweb/secureforgeweb

---

## Gravação de vídeo demo (opcional)

1. Gravar tela seguindo [DEMO.md](DEMO.md)
2. Duração alvo: 12–20 minutos (incluir benchmark admin se possível)
3. Narração: problema → solução → config IA → análises → achados → PDF → comparativo admin
