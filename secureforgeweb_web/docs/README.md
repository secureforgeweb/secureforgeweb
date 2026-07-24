# Documentação — SecureForge Web

Índice da documentação **pública** versionada neste repositório.

| Artefato | Público | Conteúdo |
|---|---|---|
| [MANUAL.md](MANUAL.md) | Usuários / revisores | Manual de uso (fluxo completo + admin) |
| [PROJETO_ARQUITETURAL.md](PROJETO_ARQUITETURAL.md) | Técnico | Arquitetura, requisitos e stack da SecureForge Web |
| [PLAYLIST_DEMONSTRACAO.md](PLAYLIST_DEMONSTRACAO.md) | Revisores / demo | **Roteiro da playlist de vídeos** (copiar para o Drive) |
| [screenshots/arquitetura.png](screenshots/arquitetura.png) | Todos | **Diagrama oficial de arquitetura** (fluxo cadastro → avaliação → postura) |
| [screenshots/](screenshots/) | Todos | Demais capturas de tela da interface |
| Este `README.md` | Todos | Índice e links oficiais |

## Demonstração e vídeos (SBSeg / Salão de Ferramentas)

**[Pasta Google Drive — demonstração](https://drive.google.com/drive/folders/1oJRC9_3Zjx5ahBdgdXSajCKXhYjytKWX?usp=drive_link)**

Roteiro completo (ordem 01–05, comandos e checklist): **[PLAYLIST_DEMONSTRACAO.md](PLAYLIST_DEMONSTRACAO.md)**.

| # | Vídeo | Etapa |
|---|---|---|
| 01 | Download das ferramentas | Git, Node 22, pnpm, PostgreSQL/Docker |
| 02 | Instalação e configuração | Instalar e validar as ferramentas |
| 03 | Git clone | Repositório oficial |
| 04 | Dependências e config local | `.env`, `pnpm install`, `pnpm db:setup` |
| 05 | Execução e resultados | `pnpm dev` + ciclo ponta a ponta até PDF |
| 00 / 06 | *(opcional)* | Visão geral / HTTPS local |

> Copie `PLAYLIST_DEMONSTRACAO.md` para a pasta Drive como README. Mantenha a pasta **com acesso de leitura para qualquer pessoa com o link**.

## Código e repositório

- **GitHub:** [github.com/secureforgeweb/secureforgeweb](https://github.com/secureforgeweb/secureforgeweb)
- **Licença:** MIT (arquivo `LICENSE` na raiz do repositório)
- **README operacional (PT):** [`../readme-web.md`](../readme-web.md)
- **README do repositório:** [`../../README.md`](../../README.md)

## O que não vai para o GitHub

Outros arquivos em `docs/` (Overleaf, rascunhos, PDFs auxiliares, extratos, scripts locais) ficam **somente na máquina local** e estão cobertos pelo `.gitignore`.
