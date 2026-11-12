const ALLOWED_HOST = "hydra.ojack.xyz";
const MIN_ID_LEN = 6;

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  return crypto.subtle.timingSafeEqual(ea, eb);
}

async function shorten(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!env.ADMIN_TOKEN || !timingSafeEqual(auth, `Bearer ${env.ADMIN_TOKEN}`)) {
    return new Response("unauthorized\n", { status: 401 });
  }

  const raw = (await request.text()).trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    return new Response("invalid url\n", { status: 400 });
  }
  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) {
    return new Response(`only https://${ALLOWED_HOST} links allowed\n`, { status: 400 });
  }
  const target = url.toString();

  const existing = await env.DB.prepare("SELECT id FROM links WHERE url = ?").bind(target).first();
  if (existing) return shortResponse(request, existing.id);

  // Deterministic id: hash prefix, lengthened only on collision with a different URL.
  const hash = await sha256Hex(target);
  for (let len = MIN_ID_LEN; len <= hash.length; len++) {
    const id = hash.slice(0, len);
    const res = await env.DB.prepare("INSERT OR IGNORE INTO links (id, url) VALUES (?, ?)")
      .bind(id, target)
      .run();
    if (res.meta.changes === 1) return shortResponse(request, id);
  }
  return new Response("could not allocate id\n", { status: 500 });
}

function shortResponse(request, id) {
  return new Response(`${new URL(request.url).host}/${id}\n`, {
    headers: { "Content-Type": "text/plain" },
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === "POST" && pathname === "/") return shorten(request, env);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("method not allowed\n", { status: 405 });
    }

    const id = pathname.slice(1).toLowerCase();
    if (!/^[0-9a-f]{6,64}$/.test(id)) return new Response("not found\n", { status: 404 });

    const row = await env.DB.prepare("SELECT url FROM links WHERE id = ?").bind(id).first();
    if (!row) return new Response("not found\n", { status: 404 });
    return Response.redirect(row.url, 302);
  },
};
