// netlify/functions/order.js

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    // Prosta walidacja
    if (!data?.desc || String(data.desc).trim().length < 10) {
      return { statusCode: 400, body: "Opis za krótki" };
    }

    const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    if (!WEBHOOK_URL) {
      return { statusCode: 500, body: "Brak DISCORD_WEBHOOK_URL" };
    }

    const content =
`⚡ **NOWE ZAMÓWIENIE BOTA**
📦 Pakiet: **${data.packLabel}** (${data.packId})
💸 ${data.priceLine}

👤 Nick/ID: ${data.user || "—"}
🌐 Serwer: ${data.guild || "—"}
⏳ Termin: ${data.deadline || "—"}

📝 Opis:
${data.desc}
`;

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900) }) // discord limit
    });

    if (!res.ok) {
      const t = await res.text();
      return { statusCode: 502, body: "Webhook error: " + t };
    }

    return { statusCode: 200, body: "OK" };
  } catch (e) {
    return { statusCode: 500, body: "Error: " + String(e) };
  }
}
