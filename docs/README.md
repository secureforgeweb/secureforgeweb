# Documentação — SecureForge Web

Índice da documentação do projeto **SecureForge Web** (Trilha 1 — AppHardener).

**Estado atual:** Entrega 3 (30/06/2026) — fluxo principal consolidado.

| Documento | Público | Conteúdo |
|---|---|---|
| [MANUAL.md](MANUAL.md) | Usuários | Manual de uso (fluxo completo + admin) |
| [DEMO.md](DEMO.md) | Apresentação | Roteiro de demonstração (~18–22 min) |
| [APRESENTACAO.md](APRESENTACAO.md) | Banca / slides | Roteiro de slides Entrega 3 |
| [RELATORIO_ENTREGA_3.md](RELATORIO_ENTREGA_3.md) | Acadêmico | **Relatório Entrega 3** — estado atual |
| [RELATORIO_ENTREGA_2.md](RELATORIO_ENTREGA_2.md) | Acadêmico | Relatório Entrega 2 — base estrutural |
| [RELATORIO_ENTREGA.md](RELATORIO_ENTREGA.md) | Acadêmico | Relatório Entrega 1 — planejamento |
| [GUIA_IMPLEMENTACAO.md](GUIA_IMPLEMENTACAO.md) | Desenvolvedores | Cronograma, fases e reaproveitamento |
| [PROJETO_ARQUITETURAL.md](PROJETO_ARQUITETURAL.md) | Acadêmico | Arquitetura alvo e requisitos |
| [BRAND.md](BRAND.md) | Design | Identidade visual e logo |

## Início rápido

- **Usar o sistema** → [MANUAL.md](MANUAL.md)
- **Subir localmente** → [README.md](../README.md) na raiz do repositório
- **Demonstrar na banca** → [DEMO.md](DEMO.md) + [APRESENTACAO.md](APRESENTACAO.md)
- **Submeter Entrega 3** → [RELATORIO_ENTREGA_3.md](RELATORIO_ENTREGA_3.md)
- **Entender a implementação** → [RELATORIO_ENTREGA_3.md](RELATORIO_ENTREGA_3.md) + [GUIA_IMPLEMENTACAO.md](GUIA_IMPLEMENTACAO.md)

## Status do projeto

**Entrega 3 concluída** (30/06/2026): fluxo principal consolidado, IA por usuário e benchmark admin.

| Capacidade | Status |
|---|---|
| Fluxo principal ponta a ponta (análise → achados → PDF) | Concluído |
| Assistente IA por usuário (OpenAI, Gemini, Azure, custom) | Concluído |
| Admin — visão global de análises + gráfico comparativo | Concluído |
| Cadastro de aplicações (URL e/ou repo Git) | Concluído |
| Checklist OWASP (24 itens / 9 categorias) | Concluído |
| Wizard com salvamento parcial e navegação livre | Concluído |
| Análises automáticas (HTTP, Git, assistente IA) | Concluído |
| Achados, dashboard, PDF | Concluído |

### Evolução em relação à Entrega 2

| Novidade Entrega 3 |
|---|
| Configuração de IA em `/profile/ai-assistant` (por usuário) |
| Admin: `/admin/analyses` — todas as análises + benchmark |
| Migrações `0015` (config IA) e `0016` (registro de runs) |
| Tabela com filtros por coluna e comparação gráfica |

Detalhes: [RELATORIO_ENTREGA_3.md](RELATORIO_ENTREGA_3.md)

## Histórico de entregas

| Entrega | Data | Documento | Foco |
|---|---|---|---|
| 1 | 15/06/2026 | [RELATORIO_ENTREGA.md](RELATORIO_ENTREGA.md) | Planejamento e arquitetura |
| 2 | 16/06/2026 | [RELATORIO_ENTREGA_2.md](RELATORIO_ENTREGA_2.md) | Base funcional mínima |
| 3 | 30/06/2026 | [RELATORIO_ENTREGA_3.md](RELATORIO_ENTREGA_3.md) | Fluxo principal consolidado |
