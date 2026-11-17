# Dependências vendorizadas (builds oficiais do npm)

Este repositório é 100% estático: os builds abaixo foram copiados dos
tarballs oficiais do npm (sem modificação, exceto a remoção dos comentários
`sourceMappingURL` — os `.map` não são incluídos).

| Pasta / arquivo | Pacote npm | Versão | Licença |
|---|---|---|---|
| `scramjet/scramjet.js`, `scramjet/scramjet.wasm` | `@mercuryworkshop/scramjet` (tag `alpha`) | `2.0.67-alpha.2` | AGPL-3.0 |
| `controller/controller.api.js`, `controller.inject.js`, `controller.sw.js` | `@mercuryworkshop/scramjet-controller` | `0.0.14` | AGPL-3.0 |
| `utils/scramjet-utils.js` | `@mercuryworkshop/scramjet-utils` | `0.0.3` | AGPL-3.0 |
| `clients/epoxy-transport.mjs` | `@mercuryworkshop/epoxy-transport` | `3.0.2` | AGPL-3.0 |
| `clients/libcurl-transport.mjs` | `@mercuryworkshop/libcurl-transport` | `2.0.6` | — |
| `uv/uv.bundle.js`, `uv.client.js`, `uv.handler.js`, `uv.sw.js` | `@titaniumnetwork-dev/ultraviolet` | `3.2.10` | MIT |
| `baremux/index.js`, `baremux/worker.js` | `@mercuryworkshop/bare-mux` | `2.1.9` | — |

> **Atenção — compatibilidade de versões:** o controller `0.0.14` exige
> exatamente o Scramjet `2.0.67-alpha.2` (ele aborta com
> *"version mismatch"* caso contrário). Ao atualizar, atualize os três
> pacotes do Scramjet juntos (`scramjet` + `scramjet-controller` +
> `scramjet-utils`) a partir das tags `alpha` do npm.

Arquivos próprios (escritos para este projeto): `index.html`, `style.css`,
`app.js`, `config.js`, `register-sw.js`, `sw.js`, `uv/uv.config.js`,
`404.html`, `assets/favicon.svg`, `README.md`.
