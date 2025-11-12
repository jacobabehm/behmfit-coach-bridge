export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // simple proof endpoints
    if (url.pathname === "/proof/read") {
      const sample = await env.JOBS.get("last_write", "json");
      return new Response(JSON.stringify({ ok: true, last_write: sample ?? null }, null, 2), {
        headers: { "content-type": "application/json" }
      });
    }

    if (url.pathname === "/proof/write") {
      const now = new Date().toISOString();
      const record = { timestamp: now, note: "BehmFit proof write" };
      await env.JOBS.put("last_write", JSON.stringify(record));
      return new Response(JSON.stringify({ ok: true, written: record }, null, 2), {
        headers: { "content-type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
