/* eslint-disable */
/**
 * bare-relay.js — optional CORS relay for public/sw.js.
 *
 * Deploy free at https://workers.cloudflare.com (Create Worker → paste → Deploy),
 * then put the resulting URL first in the RELAYS array in public/sw.js:
 *     const RELAYS = ["https://<name>.<sub>.workers.dev/?url=", ...];
 *
 * Nothing in your GitHub Pages repo structure changes. The browser only ever
 * talks to your Pages domain (service worker) and this neutral workers.dev
 * hostname — never to a game domain.
 */
export default {
  async fetch(request) {
    const inbound = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }

    const target = inbound.searchParams.get("url");
    if (!target) return new Response("missing ?url=", { status: 400, headers: cors() });

    let upstream;
    try {
      upstream = new URL(decodeURIComponent(target));
    } catch {
      return new Response("bad url", { status: 400, headers: cors() });
    }
    if (!/^https?:$/.test(upstream.protocol)) {
      return new Response("bad scheme", { status: 400, headers: cors() });
    }

    const headers = new Headers(request.headers);
    ["host", "origin", "referer", "cf-connecting-ip", "x-forwarded-for"].forEach((h) => headers.delete(h));
    headers.set("referer", upstream.origin + "/");
    headers.set(
      "user-agent",
      request.headers.get("user-agent") ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    );

    const res = await fetch(upstream.href, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "follow",
    });

    const out = new Headers(res.headers);
    ["content-security-policy", "content-security-policy-report-only", "x-frame-options", "cross-origin-embedder-policy", "cross-origin-opener-policy", "permissions-policy", "report-to"].forEach((h) =>
      out.delete(h),
    );
    for (const [k, v] of Object.entries(cors())) out.set(k, v);

    return new Response(res.body, { status: res.status, headers: out });
  },
};

function cors() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,HEAD,OPTIONS",
    "access-control-allow-headers": "*",
    "access-control-expose-headers": "*",
  };
}
