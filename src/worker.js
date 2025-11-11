export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const pathId = env.COACH_PATH_ID;

    // Health probe (no Airtable call)
    if (u.pathname === `/coach/${pathId}/health`) {
      return new Response(JSON.stringify({ ok: true, pathIdMatched: true }), {
        status: 200, headers: { "content-type": "application/json" }
      });
    }

    // Route must match exactly
    const okPath = u.pathname.startsWith(`/coach/${pathId}/upsert-activity`);
    if (!okPath) {
      return new Response(JSON.stringify({
        ok: false,
        reason: "route_mismatch",
        expectedPrefix: `/coach/${pathId}/upsert-activity`,
        got: u.pathname
      }), { status: 404, headers: { "content-type": "application/json" } });
    }

    const q = u.searchParams;
    const fields = {
      activity_id: String(q.get("activity_id") || ""),
      name: q.get("name") || null,
      type: q.get("type") || null,
      start_iso: q.get("start_iso") || null,
      distance_m: q.get("distance_m") ? Number(q.get("distance_m")) : null,
      elapsed_s: q.get("elapsed_s") ? Number(q.get("elapsed_s")) : null,
      avg_hr: q.get("avg_hr") ? Number(q.get("avg_hr")) : null
    };
    if (!fields.activity_id) {
      return new Response(JSON.stringify({ ok:false, error:"Missing activity_id"}), {
        status: 400, headers: { "content-type":"application/json" }
      });
    }

    const res = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/activities`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.AIRTABLE_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn: ["activity_id"] },
        records: [{ fields }]
      })
    });

    const text = await res.text();
    return new Response(text, { status: res.status, headers: { "content-type":"application/json" } });
  }
}
