/* ==========================================================================
 * Hugs — app.js
 * --------------------------------------------------------------------------
 * Lógica principal: inicializa o Scramjet v2 (principal) com fallback
 * Ultraviolet, gerencia navegação, cloak (about:blank + tab cloak),
 * configurações (WISP / transporte / busca) e status.
 *
 * Dependências (carregadas em index.html, nesta ordem):
 *   config.js -> register-sw.js -> scramjet.js -> controller.api.js
 *   -> scramjet-utils.js -> uv.bundle.js -> baremux/index.js -> app.js
 * ========================================================================== */
(function () {
  "use strict";

  // ---------------------------------------------------------------- helpers
  var $ = function (id) {
    return document.getElementById(id);
  };

  var BASE = window.__HUGS_BASE || "./";
  var CFG = window.__HUGS_CONFIG || {};

  var LS_KEY = "hugs-settings-v1";

  function loadSettings() {
    var s = {
      engine: CFG.engine || "scramjet",
      transport: CFG.transport || "libcurl",
      wispUrl: CFG.wispUrl || "wss://wisp.mercurywork.shop/",
      searchEngine: CFG.searchEngine || "https://www.google.com/search?q=%s",
      cloak: CFG.cloak || "none",
    };
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        for (var k in s) {
          if (saved && typeof saved[k] === "string" && saved[k]) s[k] = saved[k];
        }
      }
    } catch (e) {
      /* localStorage indisponível — segue com o padrão */
    }
    return s;
  }

  var settings = loadSettings();

  function saveSettings() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(settings));
    } catch (e) {
      /* ignora */
    }
  }

  // Normaliza URL do WISP: garante ws(s):// + barra final.
  function normalizeWispUrl(value) {
    var v = String(value || "").trim();
    if (!v) return v;
    if (v.startsWith("http://")) v = "ws://" + v.slice(7);
    else if (v.startsWith("https://")) v = "wss://" + v.slice(8);
    else if (!v.startsWith("ws://") && !v.startsWith("wss://")) {
      v = (location.protocol === "https:" ? "wss://" : "ws://") + v;
    }
    if (!v.endsWith("/")) v += "/";
    return v;
  }

  settings.wispUrl = normalizeWispUrl(settings.wispUrl);

  function wispCandidates() {
    var list = [settings.wispUrl]
      .concat(CFG.wispFallbacks || [])
      .map(normalizeWispUrl)
      .filter(Boolean);
    // dedup preservando ordem
    var seen = {};
    return list.filter(function (u) {
      if (seen[u]) return false;
      seen[u] = true;
      return true;
    });
  }

  // ------------------------------------------------------------------- DOM
  var iframeEl = $("proxy-frame");
  var homeEl = $("home");
  var browserEl = $("browser");
  var urlInput = $("url-input");
  var homeInput = $("home-input");
  var statusEl = $("status");
  var engineBadge = $("engine-badge");
  var errorBox = $("error-box");
  var errorTitle = $("error-title");
  var errorMsg = $("error-msg");

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = "status" + (kind ? " " + kind : "");
  }

  function showError(title, msg) {
    errorTitle.textContent = title;
    errorMsg.textContent = msg ? " " + msg : "";
    errorBox.hidden = false;
    $("btn-fallback-uv").hidden = settings.engine === "uv";
    $("btn-fallback-sj").hidden = settings.engine !== "uv";
  }

  function hideError() {
    errorBox.hidden = true;
  }

  function updateBadge() {
    engineBadge.textContent = settings.engine === "uv" ? "ultraviolet" : "scramjet v2";
  }

  // ----------------------------------------------------------------- cloak
  // Favicons em data-URI (SVG) para não depender de terceiros.
  var CLOAKS = {
    none: { title: "Hugs", icon: BASE + "assets/favicon.svg" },
    google: {
      title: "Google",
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='22' fill='%23fff'/%3E%3Ctext x='24' y='33' font-size='26' text-anchor='middle' fill='%234285f4' font-family='Arial'%3EG%3C/text%3E%3C/svg%3E",
    },
    classroom: {
      title: "Google Classroom",
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='8' fill='%230f9d58'/%3E%3Ctext x='24' y='33' font-size='24' text-anchor='middle' fill='%23fff' font-family='Arial'%3EC%3C/text%3E%3C/svg%3E",
    },
    docs: {
      title: "Google Docs",
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='8' fill='%234285f4'/%3E%3Ctext x='24' y='33' font-size='22' text-anchor='middle' fill='%23fff' font-family='Arial'%3ED%3C/text%3E%3C/svg%3E",
    },
    drive: {
      title: "Google Drive",
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='8' fill='%23fbbc04'/%3E%3Ctext x='24' y='33' font-size='22' text-anchor='middle' fill='%231a1a1a' font-family='Arial'%3ED%3C/text%3E%3C/svg%3E",
    },
    bing: {
      title: "Bing",
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' rx='8' fill='%230084a1'/%3E%3Ctext x='24' y='33' font-size='24' text-anchor='middle' fill='%23fff' font-family='Arial'%3EB%3C/text%3E%3C/svg%3E",
    },
  };

  function applyCloak(preset) {
    var c = CLOAKS[preset] || CLOAKS.none;
    document.title = c.title;
    var link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = c.icon.endsWith(".svg") ? "image/svg+xml" : "image/svg+xml";
    link.href = c.icon;
  }

  // about:blank cloak — abre uma aba em branco com o app embutido.
  function openAboutBlank() {
    var target = location.href.split("#")[0];
    var win = window.open("about:blank", "_blank");
    if (!win) {
      showError(
        "Pop-up bloqueado.",
        "Permita pop-ups para este site e clique novamente em about:blank."
      );
      return;
    }
    var cloak = CLOAKS[settings.cloak] || CLOAKS.none;
    win.document.title = cloak.title;
    win.document.write(
      "<!DOCTYPE html><html><head><meta charset='utf-8'>" +
        "<title>" +
        cloak.title +
        "</title>" +
        "<link rel='icon' href='" +
        cloak.icon +
        "'>" +
        "<style>html,body{margin:0;height:100%;background:#0f0f0f}" +
        "iframe{width:100%;height:100%;border:0;display:block}</style>" +
        "</head><body><iframe></iframe></body></html>"
    );
    win.document.close();
    // Define o src via DOM (evita problemas de escaping na URL).
    win.document.querySelector("iframe").src = target;
  }

  // ----------------------------------------------------------------- busca
  function search(input, template) {
    var value = String(input || "").trim();
    if (!value) return null;
    try {
      return new URL(value).toString();
    } catch (e) {
      /* não é URL completa */
    }
    try {
      var url = new URL("http://" + value);
      if (url.hostname.includes(".")) return url.toString();
    } catch (e) {
      /* não é host */
    }
    return (template || settings.searchEngine).replace("%s", encodeURIComponent(value));
  }

  // -------------------------------------------------------------- navegação
  var currentUrl = CFG.defaultUrl || "https://www.google.com/";
  var browsing = false;

  function showBrowser() {
    homeEl.hidden = true;
    browserEl.hidden = false;
    browsing = true;
  }

  function showHome() {
    homeEl.hidden = false;
    browserEl.hidden = true;
    browsing = false;
  }

  async function navigate(rawInput) {
    var url = search(rawInput, settings.searchEngine);
    if (!url) return;
    currentUrl = url;
    urlInput.value = url;
    showBrowser();
    hideError();
    try {
      if (settings.engine === "uv") {
        await ensureUV();
        var codec = (window.Ultraviolet && window.Ultraviolet.Codec) || {};
        var enc = codec[CFG.encode] || codec.xor;
        if (!enc) throw new Error("Codec Ultraviolet indisponível.");
        iframeEl.src = location.origin + BASE + (CFG.uvPrefix || "uv/service/") + enc.encode(url);
        setStatus("Navegando (Ultraviolet)…");
      } else {
        await ensureScramjet();
        sjFrame.go(url);
        setStatus("Navegando (Scramjet)…");
      }
    } catch (err) {
      console.error("[hugs] navigate error:", err);
      setStatus("Erro ao navegar", "err");
      showError(
        "Não foi possível navegar.",
        (err && err.message) || String(err) ||
          "Verifique o servidor WISP em ⚙ Config."
      );
    }
  }

  // ------------------------------------------------------------- Scramjet
  var sjController = null;
  var sjFrame = null;
  var sjInitPromise = null;

  async function loadTransportClass() {
    if (settings.transport === "epoxy") {
      var epoxy = await import(BASE + "clients/epoxy-transport.mjs");
      return epoxy.default;
    }
    var libcurl = await import(BASE + "clients/libcurl-transport.mjs");
    return libcurl.default || libcurl.LibcurlClient;
  }

  function makeTransport(wispUrl) {
    return loadTransportClass().then(function (Cls) {
      if (!Cls) throw new Error("Classe de transporte não encontrada.");
      return new Cls({ wisp: wispUrl });
    });
  }

  // Testa um WISP com uma requisição leve; resolve true/false.
  // (init() é obrigatório: request() usa o cliente/sessão criados nele.
  // O timeout usa Promise.race porque o epoxy ignora AbortSignal.)
  async function testWisp(wispUrl) {
    try {
      var transport = await makeTransport(wispUrl);
      await transport.init();
      var req = transport.request(
        new URL("https://example.com/"),
        "GET",
        null,
        [],
        undefined
      );
      var timeout = new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error("timeout"));
        }, 10000);
      });
      await Promise.race([req, timeout]);
      return true;
    } catch (e) {
      console.warn("[hugs] WISP falhou:", wispUrl, e);
      return false;
    }
  }

  async function pickWisp() {
    var candidates = wispCandidates();
    for (var i = 0; i < candidates.length; i++) {
      setStatus("Testando WISP " + (i + 1) + "/" + candidates.length + "…");
      if (await testWisp(candidates[i])) {
        settings.wispUrl = candidates[i];
        saveSettings();
        return candidates[i];
      }
    }
    return null;
  }

  async function ensureScramjet() {
    if (sjController && sjFrame) return;
    if (sjInitPromise) return sjInitPromise;

    sjInitPromise = (async function () {
      setStatus("Registrando Service Worker…");
      var sw = await window.registerSW();

      if (!window.$scramjetController || !window.$scramjetController.Controller) {
        throw new Error("Scramjet controller não carregou (controller.api.js).");
      }

      var wispUrl = await pickWisp();
      if (!wispUrl) {
        throw new Error(
          "Nenhum servidor WISP respondeu. Configure um WISP válido em ⚙ Config " +
            "(veja o README: públicos e self-host)."
        );
      }

      setStatus("Inicializando Scramjet (" + settings.transport + ")…");
      var transport = await makeTransport(wispUrl);

      var sjConfig = {
        prefix: BASE + (CFG.scramjetPrefix || "~/sj/"),
        scramjetPath: BASE + "scramjet/scramjet.js",
        injectPath: BASE + "controller/controller.inject.js",
        wasmPath: BASE + "scramjet/scramjet.wasm",
      };

      // O controller lê o global $scramjetController.config; o bootstrap
      // oficial faz a mesma coisa (atribui inject/wasm/scramjetPath).
      try {
        Object.assign(window.$scramjetController.config, sjConfig);
      } catch (e) {
        /* segue — o init.config abaixo também define */
      }

      var Controller = window.$scramjetController.Controller;
      sjController = new Controller({
        serviceworker: sw,
        transport: transport,
        config: sjConfig,
      });
      await sjController.wait();

      var utils = window.$scramjetUtils || {};
      var plugins = [];
      if (utils.HttpCachePlugin) plugins.push(new utils.HttpCachePlugin());
      if (utils.UrlWatcherPlugin) {
        plugins.push(
          new utils.UrlWatcherPlugin(function (url) {
            if (browsing) urlInput.value = url;
          })
        );
      }
      if (utils.CatchEscapedLinksPlugin) {
        plugins.push(
          new utils.CatchEscapedLinksPlugin(function (url) {
            var u = new URL("./index.html", location.href);
            u.searchParams.set("goto", url.href);
            return u;
          })
        );
      }

      sjFrame = sjController.createFrame(iframeEl, { plugins: plugins });
      setStatus("Pronto (Scramjet)", "ok");
    })();

    try {
      await sjInitPromise;
    } catch (e) {
      sjInitPromise = null;
      sjController = null;
      sjFrame = null;
      throw e;
    }
  }

  // ------------------------------------------------------------------- UV
  var uvConn = null;
  var uvInitPromise = null;

  async function ensureUV() {
    if (uvConn) return;
    if (uvInitPromise) return uvInitPromise;

    uvInitPromise = (async function () {
      setStatus("Registrando Service Worker…");
      await window.registerSW();

      if (!window.BareMux || !window.BareMux.BareMuxConnection) {
        throw new Error("BareMux não carregou (baremux/index.js).");
      }
      if (!window.Ultraviolet || !window.Ultraviolet.Codec) {
        throw new Error("Ultraviolet não carregou (uv/uv.bundle.js).");
      }

      setStatus("Conectando Ultraviolet (Epoxy/WISP)…");
      var workerPath = new URL("./baremux/worker.js", location.href).pathname;
      var epoxyUrl = new URL("./clients/epoxy-transport.mjs", location.href).href;
      uvConn = new window.BareMux.BareMuxConnection(workerPath);
      await uvConn.setTransport(epoxyUrl, [{ wisp: settings.wispUrl }]);
      setStatus("Pronto (Ultraviolet)", "ok");
    })();

    try {
      await uvInitPromise;
    } catch (e) {
      uvInitPromise = null;
      throw e;
    }
  }

  // -------------------------------------------------------------- settings
  function syncSettingsUI() {
    $("set-engine").value = settings.engine;
    $("set-transport").value = settings.transport;
    $("set-wisp").value = settings.wispUrl;
    $("set-search").value = settings.searchEngine;
    $("set-cloak").value = settings.cloak;
    updateBadge();
  }

  async function applySettings() {
    settings.engine = $("set-engine").value;
    settings.transport = $("set-transport").value;
    settings.wispUrl = normalizeWispUrl($("set-wisp").value) || settings.wispUrl;
    settings.searchEngine = $("set-search").value;
    settings.cloak = $("set-cloak").value;
    saveSettings();
    applyCloak(settings.cloak);
    updateBadge();
    hideError();

    // Aplica transporte/WISP no Scramjet já inicializado.
    if (sjController) {
      try {
        setStatus("Atualizando transporte…");
        var transport = await makeTransport(settings.wispUrl);
        sjController.setTransport(transport);
        setStatus("Pronto (Scramjet)", "ok");
      } catch (e) {
        console.error("[hugs] setTransport error:", e);
        showError("Falha ao trocar o transporte.", (e && e.message) || String(e));
      }
    }

    // Aplica WISP no UV já inicializado.
    if (uvConn) {
      try {
        setStatus("Atualizando WISP (UV)…");
        var epoxyUrl = new URL("./clients/epoxy-transport.mjs", location.href).href;
        await uvConn.setTransport(epoxyUrl, [{ wisp: settings.wispUrl }]);
        setStatus("Pronto (Ultraviolet)", "ok");
      } catch (e) {
        console.error("[hugs] UV setTransport error:", e);
        showError("Falha ao trocar o WISP (UV).", (e && e.message) || String(e));
      }
    }

    // Se estiver navegando, recarrega a página atual no novo motor.
    if (browsing && currentUrl) {
      await navigate(currentUrl);
    }
  }

  function resetSettings() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch (e) {
      /* ignora */
    }
    settings = loadSettings();
    syncSettingsUI();
    applyCloak(settings.cloak);
    setStatus("Configurações restauradas.");
  }

  // ------------------------------------------------------------------ boot
  function wireUI() {
    $("omnibox").addEventListener("submit", function (e) {
      e.preventDefault();
      navigate(urlInput.value);
    });
    $("home-search").addEventListener("submit", function (e) {
      e.preventDefault();
      navigate(homeInput.value);
    });

    document.querySelectorAll("#quick-links .quick").forEach(function (btn) {
      btn.addEventListener("click", function () {
        navigate(btn.getAttribute("data-url"));
      });
    });

    $("btn-back").addEventListener("click", function () {
      if (settings.engine !== "uv" && sjFrame) sjFrame.back();
      else if (iframeEl.contentWindow) iframeEl.contentWindow.history.back();
    });
    $("btn-forward").addEventListener("click", function () {
      if (settings.engine !== "uv" && sjFrame) sjFrame.forward();
      else if (iframeEl.contentWindow) iframeEl.contentWindow.history.forward();
    });
    $("btn-reload").addEventListener("click", function () {
      if (settings.engine !== "uv" && sjFrame) sjFrame.reload();
      else if (iframeEl.contentWindow) iframeEl.contentWindow.location.reload();
    });
    $("btn-home").addEventListener("click", showHome);

    $("btn-aboutblank").addEventListener("click", openAboutBlank);

    var settingsEl = $("settings");
    $("btn-settings").addEventListener("click", function () {
      var open = settingsEl.hidden;
      settingsEl.hidden = !open;
      $("btn-settings").setAttribute("aria-expanded", String(open));
    });
    $("btn-settings-close").addEventListener("click", function () {
      settingsEl.hidden = true;
      $("btn-settings").setAttribute("aria-expanded", "false");
    });

    $("set-wisp-preset").addEventListener("change", function () {
      var v = this.value;
      if (v && v !== "__custom") $("set-wisp").value = v;
    });

    $("btn-apply-settings").addEventListener("click", applySettings);
    $("btn-reset-settings").addEventListener("click", resetSettings);

    $("btn-retry").addEventListener("click", function () {
      hideError();
      navigate(currentUrl);
    });
    $("btn-fallback-uv").addEventListener("click", function () {
      settings.engine = "uv";
      saveSettings();
      syncSettingsUI();
      hideError();
      navigate(currentUrl);
    });
    $("btn-fallback-sj").addEventListener("click", function () {
      settings.engine = "scramjet";
      saveSettings();
      syncSettingsUI();
      hideError();
      navigate(currentUrl);
    });
  }

  async function boot() {
    applyCloak(settings.cloak);
    syncSettingsUI();
    wireUI();
    updateBadge();

    // ?goto= (links escapados / 404 do GitHub Pages / about:blank)
    var params = new URLSearchParams(location.search);
    var goto = params.get("goto");
    if (goto) {
      try {
        history.replaceState(null, "", location.pathname + location.hash);
      } catch (e) {
        /* ignora */
      }
      currentUrl = goto;
      urlInput.value = goto;
    }

    if (CFG.autoAboutBlank) {
      // Best-effort: navegadores costumam bloquear sem gesto do usuário.
      try {
        openAboutBlank();
      } catch (e) {
        /* ignora */
      }
    }

    // Pré-inicializa o motor preferido para a primeira navegação ser rápida.
    try {
      if (settings.engine === "uv") await ensureUV();
      else await ensureScramjet();
    } catch (err) {
      console.error("[hugs] boot error:", err);
      setStatus("Erro na inicialização", "err");
      showError(
        "Falha ao iniciar o proxy.",
        (err && err.message) || String(err) ||
          "Verifique o console e o servidor WISP."
      );
      return;
    }

    if (goto) await navigate(goto);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
