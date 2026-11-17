# 🤗 Hugs — Proxy web estático para GitHub Pages

Proxy web **100% estático** (HTML/JS/CSS + Service Workers, sem build e sem
backend) usando **[Scramjet v2](https://github.com/MercuryWorkshop/scramjet)**
(MercuryWorkshop) como motor principal e **[Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet)**
(TitaniumNetwork) como fallback — pronto para hospedar no **GitHub Pages**.

> O GitHub Pages só serve arquivos estáticos e **não pode executar o servidor
> WISP**. Por isso o Hugs aponta para um servidor WISP público ou self-hosted
> (veja [Servidor WISP](#servidor-wisp)). Todo o resto (UI, Service Worker,
> Scramjet, Ultraviolet) roda no navegador do visitante.

---

## Como funciona

```
┌─────────────┐   iframe (prefixo ~/sj/…)   ┌──────────────────┐
│  index.html │ ──────────────────────────▶ │  Service Worker  │
│  (UI Hugs)  │                             │     (sw.js)      │
└─────────────┘                             └────────┬─────────┘
                                                   │ fetch interceptado
                              ┌────────────────────┴────────────────────┐
                              ▼                                         ▼
                    ┌─────────────────┐                       ┌─────────────────┐
                    │ Scramjet v2     │                       │ Ultraviolet     │
                    │ (principal)     │                       │ (fallback)      │
                    └────────┬────────┘                       └────────┬────────┘
                             │ libcurl / epoxy                         │ BareMux + epoxy
                             └──────────────────┬──────────────────────┘
                                                ▼
                                     ┌────────────────────┐
                                     │ Servidor WISP      │
                                     │ (wss://…)         │
                                     └────────────────────┘
```

- **Scramjet v2** intercepta requisições no Service Worker, reescreve
  HTML/JS/CSS e executa o conteúdo em sandbox. O transporte (libcurl ou
  epoxy) envia o tráfego via **WISP** (WebSocket) com criptografia de ponta
  a ponta.
- **Ultraviolet** é o fallback clássico (mesmo SW, prefixo `uv/service/…`),
  usando BareMux + epoxy sobre o mesmo WISP.
- Um **único** `sw.js` roteia por prefixo: `~/sj/…` → Scramjet,
  `uv/service/…` → Ultraviolet. Assim os dois motores coexistem no
  escopo do GitHub Pages.

### Sites suportados (testados no Scramjet)

YouTube · Discord · Google · Reddit · Spotify · GeForce NOW · ChatGPT ·
Instagram · X/Twitter · now.gg — e praticamente qualquer site moderno
(SPA, WebSockets, workers, mídia).

---

## Estrutura do repositório

```
/
├── index.html            # UI: omnibox, home, atalhos, configurações
├── style.css             # Estilos (dark, limpo, responsivo)
├── app.js                # Lógica: Scramjet + UV, cloak, busca, settings
├── config.js             # Configuração central (prefix, WISP, encode…)
├── register-sw.js        # Registro do Service Worker
├── sw.js                 # SW unificado (Scramjet + Ultraviolet)
├── 404.html              # Fallback SPA do GitHub Pages
├── .nojekyll             # Desativa o Jekyll (arquivos servidos como estão)
├── scramjet/             # Build Scramjet v2 (scramjet.js + scramjet.wasm)
├── controller/           # Controller do Scramjet (api / inject / sw)
├── utils/                # Plugins (cache, URL watcher, escaped links)
├── clients/              # Transportes WISP (epoxy + libcurl, ESM)
├── uv/                   # Ultraviolet fallback (bundle/client/handler/sw)
├── baremux/             # BareMux (SharedWorker) para o fallback UV
├── assets/               # favicon etc.
└── VENDORED.md           # Versões/licenças dos builds vendorizados
```

> Os builds em `scramjet/`, `controller/`, `utils/`, `clients/`, `uv/` e
> `baremux/` são os artefatos oficiais do npm (veja `VENDORED.md`). Não
> edite esses arquivos — edite `config.js`, `app.js`, `sw.js` e `index.html`.

---

## Deploy no GitHub Pages (passo a passo)

### 1. Fork (ou crie o repositório)

1. Faça **fork** deste repositório para a sua conta (botão **Fork** no topo),
   ou crie um repositório novo e copie os arquivos.
2. Se for um *project site*, o nome do repositório vira parte da URL
   (`https://SEU-USUARIO.github.io/NOME-DO-REPO/`). O Hugs detecta o caminho
   base automaticamente — **não precisa mudar nenhum caminho no código**.

### 2. Ative o GitHub Pages

1. No seu fork, vá em **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
3. **Branch:** `main` · **Folder:** `/ (root)` → **Save**.
4. Aguarde 1–2 minutos. O site fica em:
   - `https://SEU-USUARIO.github.io/NOME-DO-REPO/` (project site), ou
   - `https://SEU-USUARIO.github.io/` (se o repo for `SEU-USUARIO.github.io`).

### 3. HTTPS (obrigatório)

Service Workers **exigem HTTPS**. No GitHub Pages o HTTPS já vem ativado:
**Settings → Pages → Enforce HTTPS** (marque a opção). Sem HTTPS o proxy
não registra o SW e mostra um erro na tela.

### 4. Teste

Abra a URL do Pages, digite uma URL na barra e pressione **Ir**. Na primeira
vez o navegador registra o SW (pode levar alguns segundos) — o status no
topo mostra o progresso (`Registrando Service Worker…` → `Pronto`).

### Domínio personalizado (opcional)

1. **Settings → Pages → Custom domain:** digite seu domínio
   (ex.: `proxy.exemplo.com`) e salve. O GitHub cria um arquivo `CNAME`.
2. No provedor de DNS, crie um registro **CNAME**:
   - `proxy` → `SEU-USUARIO.github.io` (para subdomínio), ou
   - **A** records para `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153` (para domínio raiz).
3. Aguarde a propagação e marque **Enforce HTTPS** para emitir o certificado.

---

## Servidor WISP

O WISP é o "túnel" WebSocket que carrega as páginas proxied. Como o GitHub
Pages não executa código de servidor, você precisa de um WISP acessível em
`wss://…`. Configure em **`config.js`** (`wispUrl`) ou na UI (**⚙ Config**).

### Opção A — Servidor público (rápido, sem custo)

O Hugs já vem com estes padrões (tenta na ordem, com fallback automático):

| Servidor | URL | Observação |
|---|---|---|
| MercuryWorkshop (oficial) | `wss://wisp.mercurywork.shop/` | Padrão do `config.js` |
| Anura | `wss://anura.pro/` | Usado no CI oficial do Scramjet |

> ⚠️ Servidores públicos são um serviço de cortesia: podem ficar lentos,
> cair ou impor limites. Para uso sério, faça self-host (Opção B).

### Opção B — Self-host (recomendado)

Você precisa de um processo Node que aceite upgrade WebSocket e roteie para
o WISP. Duas opções populares:

**1. `wisp-js` (MercuryWorkshop) — simples**

```bash
npm i @mercuryworkshop/wisp-js ws
node -e "
const http = require('node:http');
const { server } = require('@mercuryworkshop/wisp-js/server');
const s = http.createServer((req, res) => { res.writeHead(200); res.end('wisp ok'); });
s.on('upgrade', (req, socket, head) => server.routeRequest(req, socket, head));
s.listen(8080);
"
```

**2. `wisp-server-node` — usado pelo Ultraviolet-App**

```js
import http from 'node:http';
import wisp from 'wisp-server-node';

const server = http.createServer();
server.on('upgrade', (req, socket, head) => {
  if (req.url.endsWith('/wisp/')) return wisp.routeRequest(req, socket, head);
  socket.end();
});
server.listen(8080);
```

**Hospedando o WISP:**

- **VPS** (Hetzner, DigitalOcean, Hostinger…): rode o processo acima com
  `pm2`/`systemd` e exponha via **Caddy** ou **Nginx** com TLS (o navegador
  exige `wss://` quando a página é HTTPS). Exemplo com Caddy:
  ```
  wisp.exemplo.com {
      reverse_proxy 127.0.0.1:8080
  }
  ```
  O Caddy emite o certificado automaticamente. A URL final seria
  `wss://wisp.exemplo.com/` (ou `wss://wisp.exemplo.com/wisp/` se o upgrade
  só aceita esse caminho — ajuste conforme o servidor).
- **PaaS** (Render, Fly.io, Railway): crie um serviço web a partir de um
  repositório com o script acima, exponha a porta e use a URL `wss://`
  gerada pela plataforma.
- **Docker:** empacote o script Node em uma imagem e publique em qualquer
  host com TLS na frente.

Depois, aponte o Hugs para o seu WISP:

- **Pela UI:** ⚙ Config → *Servidor WISP* → cole `wss://seu-wisp/` → **Aplicar**.
- **Para todos:** edite `wispUrl` em `config.js` e faça push.

> **Segurança:** um WISP público vê apenas metadados de conexão (o tráfego
> útil é criptografado de ponta a ponta pelo transporte epoxy/libcurl).
> Mesmo assim, prefira self-host para privacidade e estabilidade.

---

## Configuração (`config.js`)

| Chave | Padrão | Descrição |
|---|---|---|
| `engine` | `"scramjet"` | Motor inicial: `scramjet` ou `uv` |
| `transport` | `"libcurl"` | Transporte Scramjet: `libcurl` ou `epoxy` |
| `wispUrl` | `wss://wisp.mercurywork.shop/` | Servidor WISP principal |
| `wispFallbacks` | lista acima | WISPs tentados se o principal falhar |
| `scramjetPrefix` | `"~/sj/"` | Prefixo do Scramjet (relativo ao base) |
| `uvPrefix` | `"uv/service/"` | Prefixo do Ultraviolet (relativo ao base) |
| `encode` | `"xor"` | Codec do UV: `xor`, `base64` ou `plain` |
| `searchEngine` | Google | Template com `%s` para buscas |
| `defaultUrl` | `https://www.google.com/` | URL inicial da barra |
| `cloak` | `"none"` | Cloak padrão da aba (ver abaixo) |
| `autoAboutBlank` | `false` | Tentar abrir em about:blank ao carregar |

As escolhas feitas na UI (**⚙ Config**) ficam salvas no navegador
(`localStorage`) e sobrescrevem o `config.js` apenas para aquele visitante.
Para mudar o padrão de todos, edite o `config.js` e faça push.

---

## Cloak (disfarce)

### Tab cloak (título + ícone da aba)

Em **⚙ Config → Cloak da aba**, escolha: Nenhum, Google, Google Classroom,
Google Docs, Google Drive ou Bing. O título e o favicon da aba mudam
imediatamente (útil para se passar por uma página escolar).

### about:blank cloak

Clique em **about:blank** no topo: abre uma nova aba em branco com o Hugs
embutido em tela cheia. A aba original pode ser fechada — o histórico mostra
apenas `about:blank`. (Navegadores bloqueiam pop-ups sem clique, por isso o
cloak automático ao carregar vem desativado por padrão.)

---

## Desenvolvimento local

O projeto não precisa de build. Para testar localmente:

```bash
# qualquer servidor estático na raiz do repositório
python3 -m http.server 8000
# abra http://localhost:8000/
```

> Service Workers funcionam em `localhost` sem HTTPS. Para testar o WISP
> local, suba um `wisp-js` (veja acima) e aponte o *Servidor WISP* para
> `ws://localhost:8080/`.

---

## Solução de problemas

| Sintoma | Causa provável | Correção |
|---|---|---|
| "Service Workers exigem HTTPS" | Site aberto via HTTP | Use a URL `https://` do Pages ou `localhost` |
| "Nenhum servidor WISP respondeu" | WISP fora do ar / URL errada | Troque o WISP em ⚙ Config; teste outro preset |
| Página em branco / erro no iframe | SW antigo em cache | Recarregue com Ctrl+Shift+R ou limpe os dados do site |
| Scramjet: *"version mismatch"* | Builds misturados | Atualize `scramjet/` + `controller/` + `utils/` juntos (veja `VENDORED.md`) |
| YouTube/Discord não carrega | WISP público instável | Use self-host ou troque o transporte para `libcurl` |
| SW não atualiza após push | Cache do SW | DevTools → Application → *Update on reload* / *Unregister* |
| Erro de sintaxe no `scramjet.js` em navegador antigo | O build oficial usa *RegExp modifiers* (`(?i:…)`) | Use um navegador atual: Chrome/Edge 125+, Firefox 131+ ou Safari 18.4+ |

---

## Créditos e licenças

- **[Scramjet](https://github.com/MercuryWorkshop/scramjet)**,
  **[epoxy-transport](https://github.com/MercuryWorkshop/epoxy-transport)**,
  **[libcurl-transport](https://github.com/MercuryWorkshop/libcurl-transport)**,
  **[bare-mux](https://github.com/MercuryWorkshop/bare-mux)** e
  **[wisp-js](https://github.com/MercuryWorkshop/wisp-js)** — MercuryWorkshop
  (AGPL-3.0 / LGPL / MIT, conforme o pacote).
- **[Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet)** —
  TitaniumNetwork (MIT).
- Interface, `config.js`, `sw.js` e demais arquivos próprios deste
  repositório: uso livre para fins educacionais.

> Use com responsabilidade: respeite os termos dos sites acessados e as
> políticas da sua rede/instituição.
