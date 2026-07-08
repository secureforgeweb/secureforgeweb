# Documentação — SecureForge Web

Índice da documentação do projeto **SecureForge Web** (AppHardener).

**Estado atual:** julho/2026 — ASVS 5.0, i18n PT/EN, UX admin refinada.

| Documento | Público | Conteúdo |
|---|---|---|
| [MANUAL.md](MANUAL.md) | Usuários | Manual de uso (fluxo completo + admin) |
| [RELATORIO.md](RELATORIO.md) | Acadêmico | **Relatório** consolidado — estado atual |
| [PROJETO_ARQUITETURAL.md](PROJETO_ARQUITETURAL.md) | Acadêmico | Arquitetura alvo e requisitos |

## Início rápido

- **Usar o sistema** → [MANUAL.md](MANUAL.md)
- **Subir localmente** → [`readme-web.md`](../readme-web.md) ou [`README.md`](../../README.md) na raiz do repositório
- **Entender a implementação** → [RELATORIO.md](RELATORIO.md) + [PROJETO_ARQUITETURAL.md](PROJETO_ARQUITETURAL.md)

## Status do projeto

| Capacidade | Status |
|---|---|
| Fluxo principal ponta a ponta (análise → achados → PDF) | Concluído |
| Checklist Essential v1.0 (24 itens / 9 categorias) | Concluído |
| Catálogo **OWASP ASVS 5.0** (L1 + Complete) + sync admin | Concluído |
| Escolha de checklist na nova análise | Concluído |
| Wizard ASVS: busca, filtro por nível, capítulos | Concluído |
| **i18n PT/EN** (UI + erros tRPC/validação) | Concluído |
| Assistente IA por usuário (OpenAI, Gemini, Azure, custom) | Concluído |
| Admin — visão global de análises + gráfico comparativo | Concluído |
| Admin — checklist em tabela (busca, capítulos, colunas redimensionáveis) | Concluído |
| Admin / Users — tabela com colunas redimensionáveis | Concluído |
| Menu lateral recolhível (`Ctrl+B`) | Concluído |
| Cadastro de aplicações (URL e/ou repo Git) | Concluído |
| Wizard com salvamento parcial e navegação livre | Concluído |
| Análises automáticas (HTTP, Git, assistente IA) | Concluído |
| Achados, dashboard, PDF | Concluído |

Detalhes: [RELATORIO.md](RELATORIO.md)

## Capturas de tela

Imagens em [`screenshots/`](screenshots/) (dashboard, wizard, cadastro, etc.) — úteis para apresentações e relatório.

## Scripts auxiliares

| Script | Descrição |
|---|---|
| [`scripts/atualizar_artigo_sbseg2026.py`](scripts/atualizar_artigo_sbseg2026.py) | Atualiza seções do artigo SBSEG 2026 (Word) |
