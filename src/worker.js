export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const pathId = env.COACH_PATH_ID;

    // --- helpers ---
    const j = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { "content-type": "application/json" },
      });

    // --- health: verifies path + worker is alive (no Airtable call) ---
    if (u.pathname === `/coach/${pathId}/health`) {
      return j({ ok: true, pathIdMatched: true });
    }

    // --- debug: confirms secrets are present (does NOT reveal values) ---
    if (u.pathname === `/coach/${pathId}/debug-env`) {
      return j({
        hasKey: !!env.AIRTABLE_API_KEY,
        hasBase: !!env.AIRTABLE_BASE_ID,
      });
    }

    // --- probe: hit Airtable "activities" (or override via ?table=) read-only ---
    if (u.pathname === `/coach/${pathId}/probe-activities`) {
      const table = u.searchParams.get("table") || "activities";
      const r = await fetch(
        `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(
          table
        )}?maxRecords=1`,
        {
          headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` },
        }
      );
      const body = await r.text();
      return j({ upstream_status: r.status, body });
    }

    // --- upsert activity (GET → Airtable write) ---
    if (u.pathname.startsWith(`/coach/${pathId}/upsert-activity`)) {
      // Optional table override (?table=ExactTableName), default "activities"
      const table = u.searchParams.get("table") || "activities";

      // Whitelist/normalize fields
      const q = u.searchParams;
      const fields = {
        activity_id: String(q.get("activity_id") || ""), // merge key (required)
        name: q.get("name") || null,
        type: q.get("type") || null,
        start_iso: q.get("start_iso") || null, // Date field in Airtable should have "Use time" ON
        distance_m: q.get("distance_m") ? Number(q.get("distance_m")) : null,
        elapsed_s: q.get("elapsed_s") ? Number(q.get("elapsed_s")) : null,
        avg_hr: q.get("avg_hr") ? Number(q.get("avg_hr")) : null,
      };

      if (!fields.activity_id) {
        return j({ ok: false, error: "Missing activity_id" }, 400);
      }

      // POST to Airtable with upsert on activity_id
      const r = await fetch(
        `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(
          table
        )}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            performUpsert: { fieldsToMergeOn: ["activity_id"] },
            records: [{ fields }],
          }),
        }
      );

      const text = await r.text();
      // Pass Airtable’s exact response/status back for easy debugging
      return new Response(text, {
        status: r.status,
        headers: { "content-type": "application/json" },
      });
    }

    // --- fallback: route mismatch ---
    return j(
      {
        ok: false,
        reason: "route_mismatch",
        expectedPrefixes: [
          `/coach/${pathId}/health`,
          `/coach/${pathId}/debug-env`,
          `/coach/${pathId}/probe-activities`,
          `/coach/${pathId}/upsert-activity`,
        ],
        got: u.pathname,
      },
      404
    );
  },
};
