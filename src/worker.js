export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (!u.pathname.startsWith(`/coach/${env.COACH_PATH_ID}/upsert-activity`)) {
      return new Response("Not found", { status: 404 });
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
    if (!fields.activity_id) return new Response("Missing activity_id", { status: 400 });

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
    return new Response(text, { status: res.status, headers: { "content-type": "application/json" } });
  }
}

