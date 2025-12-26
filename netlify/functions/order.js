export async function onRequest(context) {
  const { request, env } = context;

  // CORS (jak chcesz, możesz ograniczyć do swojej domeny Pages)
  const origin = request.headers.get("Origin") || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return new Response("Bad JSON", { status: 400, headers: corsHeaders });
  }

  const desc = String(data?.desc || "").trim();
  if (desc.length < 10) {
    return new Response("Opis za krótki (min 10 znaków)", { status: 400, headers: corsHeaders });
  }

  // honeypot
  const hp = String(data?.hpWebsite || "").trim();
  if (hp.length > 0) {
    return new Response("Bot detected", { status: 400, headers: corsHeaders });
  }

  const content =
`⚡ **NOWE ZAMÓWIENIE BOTA**
📦 Pakiet: **${data.packLabel || "—"}** (${data.packId || "—"})
💸 ${data.priceLine || "—"}

👤 Nick/ID: ${data.user || "—"}
🌐 Serwer: ${data.guild || "—"}
⏳ Termin: ${data.deadline || "—"}

📝 Opis:
${desc}
`;

  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return new Response("Missing DISCORD_WEBHOOK_URL", { status: 500, headers: corsHeaders });
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 1900) }),
  });

  if (!res.ok) {
    const t = await res.text();
    return new Response("Webhook error: " + t, { status: 502, headers: corsHeaders });
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
}
