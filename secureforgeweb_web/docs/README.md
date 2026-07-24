# Documentação — SecureForge Web

Índice da documentação **pública** versionada neste repositório.

| Artefato | Público | Conteúdo |
|---|---|---|
| [MANUAL.md](MANUAL.md) | Usuários / revisores | Manual de uso (fluxo completo + admin) |
| [PROJETO_ARQUITETURAL.md](PROJETO_ARQUITETURAL.md) | Acadêmico / técnico | Arquitetura alvo e requisitos |
| [screenshots/arquitetura.png](screenshots/arquitetura.png) | Todos | **Diagrama oficial de arquitetura** (fluxo cadastro → avaliação → postura) |
| [screenshots/](screenshots/) | Todos | Demais capturas de tela da interface |
| Este `README.md` | Todos | Índice e links oficiais |

## Demonstração e vídeos (SBSeg / Salão de Ferramentas)

Vídeos técnicos de instalação, funcionalidades e demonstração da ferramenta:

**[Pasta Google Drive — demonstração](https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link)**

| Conteúdo esperado na pasta | Descrição |
|---|---|
| Instalação | Clone, `.env`, PostgreSQL, `pnpm install` / `pnpm db:setup` / `pnpm dev` |
| Fluxo ponta a ponta | Cadastro de app → checklist → achados → dashboard → PDF |
| (Opcional) HTTPS local | Demo de headers / autoavaliação com `pnpm https:setup` |

> Mantenha a pasta **com acesso de leitura para qualquer pessoa com o link** (ou público) para revisores do Salão de Ferramentas.

## Código e repositório

- **GitHub:** [github.com/secureforgeweb/secureforgeweb](https://github.com/secureforgeweb/secureforgeweb)
- **Licença:** MIT (arquivo `LICENSE` na raiz do repositório)
- **README operacional (PT):** [`../readme-web.md`](../readme-web.md)
- **README do repositório:** [`../../README.md`](../../README.md)

## O que não vai para o GitHub

Outros arquivos em `docs/` (Overleaf, rascunhos, PDFs auxiliares, extratos, scripts locais) ficam **somente na máquina local** e estão cobertos pelo `.gitignore`.
