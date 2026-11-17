/* ==========================================================================
 * Hugs — uv/uv.config.js (configuração do Ultraviolet fallback)
 * --------------------------------------------------------------------------
 * Equivalente ao uv.config.js padrão do Ultraviolet, mas com caminhos
 * calculados dinamicamente a partir do base do site — assim funciona
 * tanto em https://user.github.io/ quanto em https://user.github.io/REPO/.
 *
 * Contextos em que este arquivo é carregado:
 *   1. Dentro do Service Worker (via importScripts no sw.js da raiz).
 *      -> self.location.href é a URL do sw.js (ex.: /Hugs/sw.js).
 *   2. Na página principal (se carregado via <script>).
 *   3. Dentro das páginas proxied (injetado pelo UV SW via configScript).
 *      -> document.currentScript.src é a URL absoluta deste arquivo.
 *
 * Por isso o base é derivado de document.currentScript quando disponível
 * (casos 2 e 3) e de self.location apenas no SW (caso 1).
 * ========================================================================== */
(function () {
  "use strict";

  var base = "/";
  try {
    var hasCurrentScript =
      typeof document !== "undefined" &&
      document.currentScript &&
      document.currentScript.src;
    if (hasCurrentScript) {
      // Este arquivo fica em <base>uv/uv.config.js -> "../" é o base.
      base = new URL("../", document.currentScript.src).pathname;
    } else {
      // SW: self.location.href é <base>sw.js -> "./" é o base.
      base = new URL("./", self.location.href).pathname;
    }
  } catch (e) {
    base = "/";
  }
  if (!base.endsWith("/")) base += "/";

  self.__uv$config = {
    prefix: base + "uv/service/",
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: base + "uv/uv.handler.js",
    client: base + "uv/uv.client.js",
    bundle: base + "uv/uv.bundle.js",
    config: base + "uv/uv.config.js",
    sw: base + "uv/uv.sw.js",
  };
})();
