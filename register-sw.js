/* ==========================================================================
 * Hugs — register-sw.js
 * --------------------------------------------------------------------------
 * Registra o Service Worker unificado (./sw.js) e aguarda ele ficar ativo.
 * Usado por app.js. Também expõe `window.registerSW()` para uso manual
 * no console.
 *
 * O SW precisa ser servido em HTTPS (GitHub Pages já é HTTPS) ou em
 * localhost. O escopo do SW é o diretório do sw.js — por isso o sw.js
 * fica na raiz do repositório.
 * ========================================================================== */
(function () {
  "use strict";

  var ALLOWED_HTTP_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

  function swUrl() {
    // Caminho relativo ao base (funciona em / e em /REPO/).
    var base = window.__HUGS_BASE || "./";
    return base + "sw.js";
  }

  /**
   * Registra o SW e resolve com o ServiceWorker ativo.
   * @returns {Promise<ServiceWorker>}
   */
  async function registerSW() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("Seu navegador não suporta Service Workers.");
    }
    if (
      location.protocol !== "https:" &&
      !ALLOWED_HTTP_HOSTS.includes(location.hostname)
    ) {
      throw new Error(
        "Service Workers exigem HTTPS (ou localhost). " +
          "No GitHub Pages o HTTPS já vem ativado."
      );
    }

    var registration = await navigator.serviceWorker.register(swUrl(), {
      scope: window.__HUGS_BASE || "./",
      type: "classic",
      updateViaCache: "none",
    });

    // Aguarda o SW ficar ativo (installing -> activated).
    await navigator.serviceWorker.ready;

    if (registration.active) return registration.active;

    if (registration.installing) {
      await new Promise(function (resolve) {
        var sw = registration.installing;
        if (sw.state === "activated") return resolve();
        sw.addEventListener("statechange", function onChange() {
          if (sw.state === "activated") {
            sw.removeEventListener("statechange", onChange);
            resolve();
          }
        });
      });
      return registration.active;
    }

    if (registration.waiting) {
      // SW novo aguardando: força a ativação e aguarda o controller.
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      await new Promise(function (resolve) {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          function () {
            resolve();
          },
          { once: true }
        );
      });
      return navigator.serviceWorker.controller;
    }

    throw new Error("Nenhum Service Worker ativo encontrado.");
  }

  window.registerSW = registerSW;
})();
