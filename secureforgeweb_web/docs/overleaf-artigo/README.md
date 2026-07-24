# Pacote Overleaf — SecureForge Web (artigo SBC)

## Conteúdo

| Arquivo | Uso |
|---------|-----|
| `main.tex` | Artigo completo (seção **5.2 Resultados** atualizada com evidências) |
| `references.bib` | Bibliografia |
| `sbc-template.sty` / `sbc.bst` | Estilo SBC |
| `figures/` | Capturas e diagramas citados no texto |
| `figures/postura-*.pdf` | Relatórios PDF exportados pela ferramenta (anexo/evidência) |

## Como usar no Overleaf

1. Crie um projeto novo (Blank Project).
2. Faça upload de **todos** os arquivos desta pasta (incluindo `figures/`).
3. Defina `main.tex` como arquivo principal.
4. Compiler: **pdfLaTeX** (Menu → Compiler).
5. Se pedir pacotes (`caption2`, `times`, etc.), o Overleaf resolve automaticamente na maioria dos casos.

### Ajuste rápido de autores

Edite o bloco `\author{...}` no início de `main.tex`.

## Resultados incluídos (evidências)

Comparativo Checklist Essential SecureForge v1.0 (24 itens):

| Indicador | OWASP Juice Shop (15/07/2026) | SecureForge Web pós-hardening (24/07/2026) |
|-----------|-------------------------------|---------------------------------------------|
| Score | 13% | **100%** |
| Achados abertos | 21/21 | 0/0 |
| Crítica/Alta/Média/Baixa | 5/10/5/1 | 0/0/0/0 |

Evolução SecureForge (mesmo checklist):

| Medição | Score | Achados | C/A/M/B |
|---------|-------|---------|---------|
| Baseline HTTP `:5173` | 29% | 17 | 3/8/5/1 |
| Demo TLS `https://:5173` | 42% | 14 | 3/6/4/1 |
| Pós-remediação `https://:3000` + Git | **100%** | 0 | 0/0/0/0 |

Figuras principais: `fig-juice-dashboard.jpg`, `fig-juice-pdf.jpg`, `fig-sf-dashboard-global.jpg`, `fig-sf-findings.jpg`, `fig-architecture.png`.

**Dica de reavaliação:** cadastre a URL base como `https://localhost:3000` (Helmet/CSP/HSTS) e o repositório Git público; rode `pnpm https:setup` e mantenha `ENABLE_SECURE_HEADERS=1`.
