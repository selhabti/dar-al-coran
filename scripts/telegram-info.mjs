import { loadEnv, requireEnv } from "./_env.mjs";

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

  const me = await callApi("getMe");
  if (!me.ok) {
    console.error("Bot invalide:", me.description);
    process.exit(1);
  }
  console.log("Bot          :", `@${me.result.username}`, "-", me.result.first_name);
  console.log("Id           :", me.result.id);

  const info = await callApi("getWebhookInfo");
  if (info.ok) {
    console.log("Webhook url  :", info.result.url || "(aucun)");
    console.log("Statut       :", info.result.status);
    console.log("Dernier err  :", info.result.last_error_message ?? "aucune");
  }

  if (me.result.can_join_groups) {
    console.log(
      "\nNote: le bot peut rejoindre des groupes. Si vous voulez interdire cela : BotFather > /setjoingroups > Disable",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
