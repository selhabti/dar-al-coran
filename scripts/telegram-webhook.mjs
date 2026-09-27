import { loadEnv, requireEnv } from "./_env.mjs";

const args = new Set(process.argv.slice(2));

async function callApi(method, payload) {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  return response.json();
}

async function main() {
  await loadEnv();

  if (args.has("--delete")) {
    const result = await callApi("deleteWebhook", { drop_pending_updates: true });
    console.log("deleteWebhook:", result.ok ? "supprime" : result.description);
    return;
  }

  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
  const secret = requireEnv("TELEGRAM_WEBHOOK_SECRET");
  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  const result = await callApi("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message"],
    max_connections: 10,
  });

  if (!result.ok) {
    console.error("setWebhook echoue:", result.description);
    process.exit(1);
  }
  console.log("Webhook enregistre:", webhookUrl);

  const info = await callApi("getWebhookInfo");
  if (info.ok) {
    console.log("  url            :", info.result.url);
    console.log("  statut         :", info.result.status);
    console.log("  erreurs        :", info.result.last_error_message ?? "aucune");
    console.log("  maj pendantes  :", info.result.pending_update_count);
  }

  const me = await callApi("getMe");
  if (me.ok) {
    console.log("Bot:", `@${me.result.username}`, "-", me.result.first_name);
    console.log(
      "Lien d'appairage parent :",
      `https://t.me/${me.result.username}?start=CODEDUParent`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
