/* ==========================================================================
 * Hugs — sw.js (Service Worker unificado)
 * --------------------------------------------------------------------------
 * Um único SW atende os dois motores:
 *   1. Scramjet v2 (principal) — via controller/controller.sw.js
 *   2. Ultraviolet (fallback)  — via uv/uv.sw.js
 *
 * O roteamento é por prefixo:
 *   - "<base>~/sj/..."        -> Scramjet ($scramjetController)
 *   - "<base>uv/service/..."  -> Ultraviolet (UVServiceWorker)
 *
 * Este arquivo fica na raiz para que o escopo cubra todo o site no
 * GitHub Pages (tanto em / quanto em /REPO/). Todos os importScripts
 * são relativos ao próprio sw.js — nunca use caminhos absolutos "/..."
 * aqui, senão quebra em project sites.
 * ========================================================================== */

// --- Scramjet v2 -----------------------------------------------------------
// Define o global $scramjetController com { shouldRoute, route }.
importScripts("./controller/controller.sw.js");

// --- Ultraviolet fallback --------------------------------------------------
// Ordem importa: bundle (define Ultraviolet) -> config (__uv$config) -> sw.
importScripts("./uv/uv.bundle.js");
importScripts("./uv/uv.config.js");
importScripts("./uv/uv.sw.js");

var uv = null;
try {
  uv = new UVServiceWorker();
} catch (e) {
  console.error("[hugs-sw] Falha ao inicializar Ultraviolet:", e);
}

// --- Ciclo de vida ---------------------------------------------------------
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

// --- Roteamento ------------------------------------------------------------
self.addEventListener("fetch", function (event) {
  // 1) Scramjet (principal)
  try {
    var sj = self.$scramjetController;
    if (sj && typeof sj.shouldRoute === "function" && sj.shouldRoute(event)) {
      event.respondWith(sj.route(event));
      return;
    }
  } catch (e) {
    console.error("[hugs-sw] Scramjet route error:", e);
  }

  // 2) Ultraviolet (fallback)
  try {
    if (uv && uv.route(event)) {
      event.respondWith(uv.fetch(event));
      return;
    }
  } catch (e) {
    console.error("[hugs-sw] UV route error:", e);
  }

  // 3) Todo o resto: rede normal (não intercepta).
});
