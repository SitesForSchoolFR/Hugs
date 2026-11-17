/* ==========================================================================
 * Hugs — config.js
 * --------------------------------------------------------------------------
 * Configuração central do proxy. Edite este arquivo para personalizar
 * sem precisar tocar no restante do código.
 *
 * Funciona tanto em GitHub Pages "user site" (https://user.github.io/)
 * quanto em "project site" (https://user.github.io/REPO/) — o caminho
 * base é detectado automaticamente a partir da URL deste script.
 * ========================================================================== */
(function () {
  "use strict";

  // ---- Caminho base (ex.: "/" ou "/Hugs/") --------------------------------
  // config.js fica na raiz do repositório, então "./" a partir dele é a raiz.
  var base = "/";
  try {
    var src =
      (typeof document !== "undefined" &&
        document.currentScript &&
        document.currentScript.src) ||
      "";
    if (src) {
      base = new URL("./", src).pathname;
    } else if (typeof location !== "undefined") {
      base = new URL("./", location.href).pathname;
    }
  } catch (e) {
    base = "/";
  }
  if (!base.endsWith("/")) base += "/";

  // Expõe para app.js / register-sw.js / sw.js (via importScripts não há
  // acesso a este global — o sw.js calcula o próprio base).
  window.__HUGS_BASE = base;

  // ---- Configuração --------------------------------------------------------
  window.__HUGS_CONFIG = {
    // Motor principal: "scramjet" (v2) ou "uv" (Ultraviolet fallback).
    engine: "scramjet",

    // Transporte do Scramjet (ambos falam WISP):
    //   "libcurl" — libcurl.js (padrão do Scramjet; bom para vídeo/streaming)
    //   "epoxy"   — EpoxyTransport (epoxy-tls, end-to-end encrypted)
    transport: "libcurl",

    // Servidor WISP (WebSocket). O GitHub Pages é 100% estático e NÃO pode
    // hospedar o WISP — por isso apontamos para um servidor público ou
    // self-hosted. Veja o README ("Servidor WISP") para self-host.
    //
    // Públicos conhecidos (podem cair — se um falhar, o app tenta o próximo):
    //   - wss://wisp.mercurywork.shop/  (MercuryWorkshop, oficial)
    //   - wss://anura.pro/              (Anura, usado no CI do Scramjet)
    wispUrl: "wss://wisp.mercurywork.shop/",
    wispFallbacks: [
      "wss://wisp.mercurywork.shop/",
      "wss://anura.pro/",
    ],

    // Prefixo do Scramjet (relativo ao base). O controller acrescenta
    // "<id>/<frameId>/" automaticamente. NÃO mude sem entender o SW.
    scramjetPrefix: "~/sj/",

    // Prefixo do Ultraviolet fallback (relativo ao base).
    uvPrefix: "uv/service/",

    // Codificação da URL:
    //   - Scramjet usa encodeURIComponent (codec padrão do controller).
    //   - Ultraviolet usa "xor" (padrão) ou "base64" / "plain".
    encode: "xor",

    // Motor de busca usado quando o input não é uma URL.
    searchEngine: "https://www.google.com/search?q=%s",

    // URL inicial exibida na barra (home do navegador embutido).
    defaultUrl: "https://www.google.com/",

    // Cloak padrão da aba (pode ser trocado na UI; fica salvo no navegador).
    // Presets: "none" | "google" | "classroom" | "docs" | "drive" | "bing"
    cloak: "none",

    // Abrir automaticamente em about:blank ao carregar? (requer clique do
    // usuário na maioria dos navegadores — o botão manual sempre funciona).
    autoAboutBlank: false,
  };
})();
