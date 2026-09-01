/* eslint-disable */
/**
 * main.js — drop-in loader for the client-side proxy.
 *
 * 1. Registers sw.js at the site scope.
 * 2. Scans the page (now and on DOM mutations) for game iframes and rewrites
 *    their src to the same-origin proxy route, so no external game hostname
 *    ever appears in a request the network filter can see.
 * 3. Exposes window.Arcade.openCloaked(url) which launches the proxied game in
 *    an about:blank document — the URL bar shows "about:blank" and the page
 *    contents are invisible to DOM-scanning browser extensions. Dashboard
 *    navigation is untouched.
 */
(function () {
  var SCOPE = new URL(".", document.currentScript ? document.currentScript.src : location.href).pathname;
  var PREFIX = SCOPE.replace(/\/$/, "");
  var KEY = "g4m3-pr0xy";

  /* --------------------------- codec (matches sw) -------------------------- */
  function xor(str) {
    var out = "";
    for (var i = 0; i < str.length; i++) out += String.fromCharCode(str.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length));
    return encodeURIComponent(out);
  }
  function encodeUrl(url) {
    return btoa(unescape(encodeURIComponent(xor(url)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function proxy(url) {
    if (!url) return url;
    if (/^(about:|data:|blob:|javascript:|#)/i.test(url)) return url;
    var absolute;
    try {
      absolute = new URL(url, location.href).href;
    } catch (e) {
      return url;
    }
    if (absolute.indexOf(location.origin + PREFIX + "/svc/") === 0) return absolute;
    if (new URL(absolute).origin === location.origin) return absolute; // local assets stay local
    return PREFIX + "/svc/" + encodeUrl(absolute);
  }

  /* ------------------------------ registration ----------------------------- */
  var ready = navigator.serviceWorker
    ? navigator.serviceWorker
        .register(PREFIX + "/sw.js", { scope: SCOPE })
        .then(function (reg) {
          return navigator.serviceWorker.controller ? reg : navigator.serviceWorker.ready;
        })
        .catch(function (e) {
          console.warn("[arcade] proxy unavailable:", e);
        })
    : Promise.resolve();

  /* --------------------------- iframe interception ------------------------- */
  var SANDBOX = "allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-modals";

  function rewrite(frame) {
    var src = frame.getAttribute("src");
    if (!src || frame.dataset.proxied === "1") return;
    var next = proxy(src);
    if (next === src) return;
    frame.dataset.proxied = "1";
    frame.dataset.origSrc = src;
    frame.setAttribute("referrerpolicy", "no-referrer");
    if (!frame.hasAttribute("sandbox")) frame.setAttribute("sandbox", SANDBOX);
    frame.setAttribute("src", next);
  }

  function scan(root) {
    (root || document).querySelectorAll("iframe[src]").forEach(rewrite);
  }

  /*
   * Auto-rewriting every game iframe through the proxy is OPT-IN.
   * The service worker can only relay hosts that allow CORS (or a relay you
   * deploy yourself), so forcing every embed through it breaks games that
   * frame perfectly well on their own. Default: load embeds directly.
   * Set window.ARCADE_PROXY_ALL = true before this script to force proxying.
   */
  ready.then(function () {
    if (!window.ARCADE_PROXY_ALL) return;
    scan(document);
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        r.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.tagName === "IFRAME") rewrite(n);
          else if (n.querySelectorAll) scan(n);
        });
        if (r.type === "attributes" && r.target.tagName === "IFRAME") {
          if (r.target.dataset.origSrc !== r.target.getAttribute("src")) {
            r.target.dataset.proxied = "";
            rewrite(r.target);
          }
        }
      });
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  });


  /* ---------------------------- about:blank cloak -------------------------- */
  function openCloaked(url, title) {
    var win = window.open("about:blank", "_blank");
    if (!win) {
      alert("Allow pop-ups for this site to open the cloaked window.");
      return null;
    }
    var target = proxy(url);
    var doc = win.document;
    doc.title = title || document.title;
    doc.head.innerHTML =
      '<meta name="referrer" content="no-referrer">' +
      '<link rel="icon" href="' +
      (document.querySelector('link[rel="icon"]') || { href: "" }).href +
      '">' +
      "<style>html,body{margin:0;height:100%;background:#09090b;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}</style>";
    var frame = doc.createElement("iframe");
    frame.setAttribute("allow", "autoplay; fullscreen; gamepad; pointer-lock");
    frame.setAttribute("sandbox", SANDBOX);
    frame.setAttribute("referrerpolicy", "no-referrer");
    frame.src = new URL(target, location.href).href;
    doc.body.appendChild(frame);
    return win;
  }

  window.Arcade = { proxy: proxy, openCloaked: openCloaked, rescan: scan, ready: ready };
})();
