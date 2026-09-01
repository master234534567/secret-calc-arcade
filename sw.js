/* eslint-disable */
/**
 * sw.js — client-side proxy service worker (Ultraviolet-style model).
 *
 * All third-party traffic is requested as a same-origin URL:
 *     <origin><SCOPE>svc/<xor+base64url encoded absolute url>
 * so on the wire a network filter only ever resolves/inspects this GitHub
 * Pages hostname. The worker decodes the target, fetches it, strips framing
 * headers (CSP / X-Frame-Options), blocks known ad/tracker hosts, and rewrites
 * HTML/CSS/JS so nested requests stay inside the proxy.
 *
 * Drop-in: place at the repo root next to index.html. No build step.
 */

const PREFIX = new URL("./", self.registration.scope).pathname; // e.g. "/repo/"
const ROUTE = PREFIX + "svc/";
const KEY = "g4m3-pr0xy";

/**
 * Relay hops, tried in order after a direct fetch fails CORS. Each entry is a
 * URL prefix that receives the percent-encoded upstream URL appended to it and
 * must respond with `access-control-allow-origin: *`.
 * Put your own Cloudflare Worker (see workers/bare-relay.js) FIRST — it is a
 * neutral *.workers.dev hostname, never a game domain, so filters that
 * blocklist game sites see nothing recognisable.
 */
const RELAYS = [
  // "https://<your-worker>.workers.dev/?url=",
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://api.allorigins.win/raw?url=",
];

/* ----------------------------- codec (UV-like) ---------------------------- */
function xor(str, decode) {
  if (decode) str = decodeURIComponent(str);
  let out = "";
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ KEY.charCodeAt(i % KEY.length));
  }
  return decode ? out : encodeURIComponent(out);
}
function b64u(s) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64u(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return decodeURIComponent(escape(atob(s)));
}
function encodeUrl(url) {
  return b64u(xor(url, false));
}
function decodeUrl(enc) {
  return xor(unb64u(enc), true);
}
function toProxy(url) {
  return PREFIX.replace(/\/$/, "") + "/svc/" + encodeUrl(url);
}

/* ------------------------------ ad blocking ------------------------------ */
const AD_HOSTS = [
  "doubleclick.net", "googlesyndication.com", "googleadservices.com",
  "adservice.google.", "google-analytics.com", "googletagmanager.com",
  "googletagservices.com", "adnxs.com", "adsrvr.org", "rubiconproject.com",
  "pubmatic.com", "openx.net", "criteo.", "taboola.com", "outbrain.com",
  "propellerads.com", "popads.net", "poperblocker", "adsterra", "exoclick",
  "juicyads", "hilltopads", "mgid.com", "revcontent.com", "onclickads",
  "adcash", "clickadu", "trafficjunky", "smartadserver", "amazon-adsystem.com",
  "scorecardresearch.com", "quantserve.com", "moatads.com", "zedo.com",
];
const isAd = (u) => AD_HOSTS.some((h) => u.includes(h));

/* ------------------------------ lifecycle -------------------------------- */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/* -------------------------------- routing -------------------------------- */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(ROUTE)) return; // dashboard assets untouched
  event.respondWith(handle(event));
});

async function handle(event) {
  const url = new URL(event.request.url);
  let target;
  try {
    target = decodeUrl(url.pathname.slice(ROUTE.length)) + url.search;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  if (isAd(target)) return new Response("", { status: 204 });

  const t = new URL(target);
  const headers = new Headers();
  for (const [k, v] of event.request.headers) {
    if (["host", "origin", "referer", "service-worker"].includes(k.toLowerCase())) continue;
    headers.set(k, v);
  }

  const body = ["GET", "HEAD"].includes(event.request.method) ? undefined : await event.request.blob();

  // Hop chain: direct first (works for CORS-enabled hosts), then each configured
  // relay in RELAYS. A relay is any endpoint that echoes an upstream response
  // with `access-control-allow-origin: *` — deploy workers/bare-relay.js to your
  // own Cloudflare Worker and put its URL first in the list for full coverage.
  let upstream = null;
  let lastErr = "";
  for (const hop of [t.href, ...RELAYS.map((r) => r + encodeURIComponent(t.href))]) {
    try {
      const res = await fetch(hop, {
        method: event.request.method,
        headers,
        body,
        redirect: "manual",
        credentials: "omit",
      });
      if (res.type === "opaque" || res.status === 0) throw new Error("opaque");
      if (res.status >= 500 && hop !== t.href) throw new Error("relay " + res.status);
      upstream = res;
      break;
    } catch (err) {
      lastErr = String(err);
    }
  }
  if (!upstream) return new Response("upstream unreachable: " + lastErr, { status: 502 });

  // follow redirects inside the proxy
  if ([301, 302, 303, 307, 308].includes(upstream.status)) {
    const loc = upstream.headers.get("location");
    if (loc) return Response.redirect(toProxy(new URL(loc, t.href).href), 302);
  }

  const out = new Headers();
  upstream.headers.forEach((v, k) => {
    const key = k.toLowerCase();
    if (
      key === "content-security-policy" ||
      key === "content-security-policy-report-only" ||
      key === "x-frame-options" ||
      key === "cross-origin-embedder-policy" ||
      key === "cross-origin-opener-policy" ||
      key === "content-encoding" ||
      key === "content-length" ||
      key === "permissions-policy" ||
      key === "report-to"
    )
      return;
    out.set(k, v);
  });
  out.set("access-control-allow-origin", "*");

  const type = (upstream.headers.get("content-type") || "").toLowerCase();

  if (type.includes("text/html")) {
    let html = await upstream.text();
    html = rewriteHtml(html, t.href);
    return new Response(html, { status: upstream.status, headers: out });
  }
  if (type.includes("css")) {
    const css = rewriteCss(await upstream.text(), t.href);
    return new Response(css, { status: upstream.status, headers: out });
  }
  if (type.includes("javascript")) {
    const js = rewriteJs(await upstream.text(), t.href);
    return new Response(js, { status: upstream.status, headers: out });
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

/* ------------------------------- rewriters ------------------------------- */
const abs = (u, base) => {
  try {
    return new URL(u, base).href;
  } catch {
    return null;
  }
};

function rewriteAttrUrl(value, base) {
  const v = value.trim();
  if (!v || v.startsWith("data:") || v.startsWith("blob:") || v.startsWith("#") || v.startsWith("javascript:"))
    return value;
  const a = abs(v, base);
  return a ? toProxy(a) : value;
}

function rewriteHtml(html, base) {
  // <base> so relative URLs resolve before our rewrite
  html = html.replace(/<base\b[^>]*>/gi, "");
  html = html.replace(
    /\s(src|href|action|poster|data-src)\s*=\s*("([^"]*)"|'([^']*)')/gi,
    (m, attr, _q, d, s) => ` ${attr}="${rewriteAttrUrl(d ?? s ?? "", base)}"`,
  );
  html = html.replace(/\ssrcset\s*=\s*"([^"]*)"/gi, (m, set) => {
    const parts = set.split(",").map((p) => {
      const [u, ...rest] = p.trim().split(/\s+/);
      return [rewriteAttrUrl(u, base), ...rest].join(" ");
    });
    return ` srcset="${parts.join(", ")}"`;
  });
  // strip CSP meta + common ad script tags
  html = html.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");
  html = html.replace(/<script[^>]+src="[^"]*(?:googlesyndication|doubleclick|adsbygoogle|propeller|popads|adsterra)[^"]*"[^>]*><\/script>/gi, "");
  // inject client shim
  const shim = `<script>(function(){var P=${JSON.stringify(PREFIX)},B=${JSON.stringify(base)};
function enc(u){try{u=new URL(u,B).href}catch(e){return u}
var k=${JSON.stringify(KEY)},o="";for(var i=0;i<u.length;i++)o+=String.fromCharCode(u.charCodeAt(i)^k.charCodeAt(i%k.length));
o=encodeURIComponent(o);return P.replace(/\\/$/,"")+"/svc/"+btoa(unescape(encodeURIComponent(o))).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"")}
var of=window.fetch;window.fetch=function(i,n){try{if(typeof i==="string"&&!i.startsWith(P))i=enc(i)}catch(e){}return of.call(window,i,n)};
var oo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){try{if(typeof u==="string"&&!u.startsWith(P))u=enc(u)}catch(e){}return oo.apply(this,[m,u].concat([].slice.call(arguments,2)))};
window.open=function(){return null};})();</script>`;
  return html.includes("<head") ? html.replace(/<head[^>]*>/i, (m) => m + shim) : shim + html;
}

function rewriteCss(css, base) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => `url("${rewriteAttrUrl(u, base)}")`);
}

function rewriteJs(js, base) {
  // conservative: only absolute http(s) string literals
  return js.replace(/(["'])(https?:\/\/[^"'\s]+)\1/g, (m, q, u) => (isAd(u) ? `${q}about:blank${q}` : `${q}${toProxy(u)}${q}`));
}
