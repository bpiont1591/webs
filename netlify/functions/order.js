// netlify/functions/order.js

const memory = new Map(); // prosty rate-limit per IP (na instancję)

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(obj),
  };
}

function clamp(str, max) {
  str = String(str || "");
  return str.length > max ? str.slice(0, max) : str;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  const ip =
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["x-forwarded-for"] ||
    "unknown";

  // rate limit: max 3/min per IP (na instancję)
  const now = Date.now();
  const key = String(ip);
  const arr = memory.get(key) || [];
  const recent = arr.filter((t) => now - t < 60_000);
  if (recent.length >= 3) {
    memory.set(key, recent);
    return json(429, { ok: false, error: "Too many requests, try later" });
  }
  recent.push(now);
  memory.set(key, recent);

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const packId = clamp(body.packId, 30);
  const packLabel = clamp(body.packLabel, 60);
  const priceText = clamp(body.priceText, 120);

  const user = clamp(body.user, 120);
  const guild = clamp(body.guild, 200);
  const desc = clamp(body.desc, 1500);
  const deadline = clamp(body.deadline, 120);
  const content = clamp(body.content, 1800); // discord limit ~2000

  if (!desc || desc.trim().length < 10) {
    return json(400, { ok: false, error: "Description too short" });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return json(500, { ok: false, error: "Missing DISCORD_WEBHOOK_URL env" });
  }

  const message =
`⚡ **NOWE ZAMÓWIENIE**
📦 Pakiet: **${packLabel || "?"}** (${packId || "?"})
💸 ${priceText || "—"}

👤 Nick/ID: ${user || "—"}
🏠 Serwer: ${guild || "—"}
⏳ Termin: ${deadline || "—"}

📝 Opis:
${desc}

---`.slice(0, 1900);

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: message,
        // opcjonalnie: username / avatar_url
        // username: "Lightning Orders",
      }),
    });

    if (!r.ok) {
      return json(502, { ok: false, error: "Discord webhook failed" });
    }

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { ok: false, error: "Server error" });
  }
};
