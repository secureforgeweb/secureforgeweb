# Protocolo do estudo Essential (24/07/2026) — Selo R

Documento de apoio à secção **Experimentos** do README da raiz.
Objetivo: tornar o estudo **repetível em método**, com rastreio aos PDFs em `resultados/`.

## 1. Condições da plataforma (ferramenta)

| Item | Valor no estudo |
|------|-----------------|
| Data das análises / PDFs | **24/07/2026** (exportações ~16:48; SecureForge v2 ~16:56) |
| Checklist | **Checklist Essential SecureForge v1.0** (24 itens / 9 categorias) |
| Host da ferramenta | Ambiente local (Windows), Node.js **22**, pnpm, PostgreSQL **16+** |
| Assistente IA | Opcional (`gpt-4o-mini`); **sugestão ≠ decisão** |
| Score | `(conforme + N/A) / 24` (N/A conta como positivo) |
| Taxa de resolução nos PDFs | **0%** (escolha metodológica: achados ficaram “abertos” no export) |

## 2. Procedimento por alvo (repetível)

1. Garantir SecureForge Web operacional (`pnpm db:setup`, `pnpm dev`).
2. Criar conta / autenticar.
3. **Aplicações → Nova aplicação**: nome do alvo; URL base quando disponível; repositório Git **público** HTTPS quando aplicável.
4. Iniciar análise com **Checklist Essential SecureForge v1.0**.
5. Percorrer os 24 itens no wizard:
   - consultar evidências HTTP/Git/IA quando existirem;
   - classificar cada item: conforme / não conforme / parcial / N/A;
   - registar notas breves quando a evidência for ambígua.
6. **Dois analistas** (ver §5): se divergirem, discutir até **consenso** no item; a classificação final é a consensual.
7. Concluir análise → gerar achados → dashboard → **Exportar PDF**.
8. Comparar score, total de achados e severidades C/A/M/B com a tabela do README e com o PDF correspondente nesta pasta.

## 3. Alvos, URLs e como preparar

### 3.1 Demos públicas (URL no PDF)

| Alvo | URL usada no estudo | Como repetir |
|------|---------------------|--------------|
| Ghost CMS | `https://demo.ghost.io/` | Cadastrar a mesma URL (demo pública pode mudar ao longo do tempo) |
| Gitea | `https://demo.gitea.com/` | Idem |
| Mattermost | `https://community.mattermost.com/landing#/` | Idem |
| SecureForge Web / v2 | `https://localhost:5173/` | Instância local da própria ferramenta (TLS local / mkcert conforme README) |

### 3.2 Laboratórios vulneráveis (URL não impressa no PDF)

No export PDF destes alvos **não há campo URL**. Foram avaliados como instâncias **locais** (labs intencionais). Para **reproduzir o método**, use as fontes oficiais abaixo e cadastre a URL local resultante (ex.: `http://localhost:<porta>`). **Versões exatas do estudo não foram pinadas** — scores podem variar ligeiramente.

| Alvo | Fonte oficial (referência) | Arranque típico (exemplo) |
|------|----------------------------|---------------------------|
| OWASP Juice Shop | https://github.com/juice-shop/juice-shop | `docker run --rm -p 3000:3000 bkimminich/juice-shop` → `http://localhost:3000` |
| DVWA | https://github.com/digininja/DVWA | Seguir README / imagem Docker da comunidade → tipicamente `http://localhost` |
| OWASP WebGoat (Java) | https://github.com/WebGoat/WebGoat | Releases/Docker oficiais WebGoat |
| OWASP WebGoat (PHP) | Projeto OWASP WebGoat PHP (legado educativo) | Instância local conforme documentação do pacote usado |
| OWASP NodeGoat | https://github.com/OWASP/NodeGoat | README do repositório (Node + Mongo) |
| OWASP Mutillidae II | https://github.com/webpwnized/mutillidae | Docker/XAMPP conforme README |
| VAmPI | https://github.com/erev0s/VAmPI | API Flask local (porta do README do projeto) |

> **Honestidade metodológica:** não é possível garantir bit-a-bit os mesmos scores sem a mesma build/porta/configuração do dia 24/07/2026. O Selo R aqui cobre: **mesmo checklist, mesmo fluxo HITL, mesmos PDFs de referência e ordenação qualitativa** (labs ≤ demos ≤ autoavaliação endurecida).

## 4. Mapeamento PDF ↔ tabela e matriz 24×12

Ver `README.md` nesta pasta. Cada PDF lista os **achados (NC)**.

A classificação completa dos 24 itens por alvo está em:

- [`MATRIZ_ESSENTIAL_2026-07-24.md`](MATRIZ_ESSENTIAL_2026-07-24.md) — matriz + contagens C / NA / NC
- [`matriz-essential-2026-07-24.csv`](matriz-essential-2026-07-24.csv) — mesma matriz em CSV

**NC** = autoritativo (PDF). **C** / **NA** = reconstrução dos autores (2026-08-13) nos itens sem achado, com regras documentadas na matriz; SecureForge (white-box) sem NA. Scores validados: `(C+NA)/24`.

## 5. Consenso entre dois analistas

Protocolo usado no estudo:

1. Cada analista percorreu o wizard **com as mesmas evidências** (HTTP/Git/IA + inspeção manual).
2. Classificação **independente** por item (conforme / não conforme / parcial / N/A).
3. Em **divergência**, discussão curta com base na evidência observável; decisão final = **consenso**.
4. Sugestões do LLM **nunca** substituíram o consenso humano.
5. Após consenso, concluiu-se a análise e exportou-se o PDF (fonte pública dos achados).

**Limitação:** as fichas item-a-item e o log de divergências **não foram versionados** neste repositório. O artefacto reproduzível público por alvo é o **PDF** (lista de achados + score + severidades).

## 6. Ciclo de hardening SecureForge (63% → 75%)

| | Baseline | v2 (pós-hardening parcial) |
|--|----------|----------------------------|
| PDF | `secureforgeweb-secureforge-web-2026-07-24.pdf` | `secureforgeweb-secureforge-web-v2-2026-07-24.pdf` |
| URL | `https://localhost:5173/` | `https://localhost:5173` |
| Score / achados | 63% / 9 | 75% / 6 |
| Achados | DATA-01, HEADER-01, HEADER-02, **EXPOS-01**, **DATA-02**, HEADER-03, HEADER-04, **SURF-01**, SURF-02 | DATA-01, HEADER-01, HEADER-02, HEADER-03, HEADER-04, SURF-02 |

**Itens que deixaram de gerar achado** (passaram a conforme ou N/A na reavaliação): **EXPOS-01**, **DATA-02**, **SURF-01**.

### Como preparar um estado “baseline” vs “v2” para repetir a reivindicação 3

Avaliar a SecureForge local em `https://localhost:5173` (ou `http://localhost:5173` / `:3000` conforme TLS) **duas vezes**:

1. **Baseline:** arranque padrão de desenvolvimento (`pnpm dev`) **sem** endurecimento consciente de headers/APIs/superfície; percorrer Essential com consenso; exportar PDF.
2. **v2 (parcial):** antes da segunda análise, aplicar remediações **observáveis** alinhadas aos itens que saíram do plano de ação:
   - **EXPOS-01** — garantir que endpoints sensíveis da API exigem autenticação (comportamento já esperado da app; confirmar na evidência HTTP que rotas protegidas não respondem dados sem sessão).
   - **DATA-02** — evitar credenciais/tokens em logs de desenvolvimento; mascarar campos sensíveis se houver logging verboso.
   - **SURF-01** — desativar serviços/debug desnecessários na instância avaliada (ex.: não expor painéis/ferramentas extras na mesma origem avaliada).
3. Reavaliar com o **mesmo** checklist e protocolo de consenso; comparar lista de achados com os dois PDFs de referência.

**Ainda abertos em ambos os PDFs:** DATA-01 (TLS), HEADER-01..04, SURF-02 — o hardening do estudo foi **parcial**, não conformidade plena.

> Nota: experiências internas posteriores (ex.: score ~100% com Helmet + HTTPS em `:3000`) **não** substituem os PDFs oficiais 63%/75% deste estudo SBSeg.

## 7. O que este pacote permite vs não permite

| Permite | Não permite (sem dados adicionais) |
|---------|-------------------------------------|
| Repetir o fluxo ponta a ponta na ferramenta | Bit-exact das builds/portas dos labs do dia 24/07 |
| Comparar PDFs novos com os 12 de referência | Fichas manuscritas / log de divergências originais |
| Consultar matriz C/NA/NC (NC dos PDFs; C/NA reconstruídos) | Garantir o mesmo score absoluto em demos online que mudam |
| Reproduzir demos/labs via fontes oficiais | — |
| Reproduzir o *delta* 63%→75% (3 achados a menos) | — |
