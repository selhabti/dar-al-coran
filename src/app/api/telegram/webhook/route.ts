import { findGuardianByLinkCode, getStudentName, linkGuardianToTelegram } from "@/lib/data/guardians";
import { replyToChat, type TelegramMessageUpdate } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";

function linkCodeFrom(text: string): string {
  const withoutCommand = text.trim().replace(/^\/start(@\S+)?\s*/i, "").trim();
  return withoutCommand.split(/\s+/)[0]?.trim() ?? "";
}

export async function POST(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const provided = request.headers.get("x-telegram-bot-api-secret-token");
    if (provided !== expected) {
      return new Response("forbidden", { status: 403 });
    }
  }

  let update: TelegramMessageUpdate;
  try {
    update = (await request.json()) as TelegramMessageUpdate;
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const message = update.message;
  const text = message?.text;
  const chatId = message?.chat?.id;

  if (!chatId || !text || !text.startsWith("/start")) {
    return Response.json({ ok: true, handled: false });
  }

  const code = linkCodeFrom(text);
  if (!code) {
    await replyToChat(
      chatId,
      "Lien incomplet. Utilisez le lien de connexion recu de votre professeur pour finaliser l'appairage.",
    );
    return Response.json({ ok: true, handled: true });
  }

  const guardian = await findGuardianByLinkCode(code);
  if (!guardian) {
    await replyToChat(
      chatId,
      "Ce lien de connexion n'est pas reconnu. Verifiez le lien recu ou contactez votre professeur.",
    );
    return Response.json({ ok: true, handled: true });
  }

  const student = await getStudentName(guardian.student_id);
  const studentName = student ? `${student.first_name} ${student.last_name}` : "votre enfant";

  await linkGuardianToTelegram({
    guardianId: guardian.id,
    chatId: String(chatId),
    username: message?.from?.username ?? null,
  });

  await replyToChat(
    chatId,
    [
      `السلام عليكم ${guardian.full_name},`,
      "",
      `Votre compte Telegram est maintenant relié à ${studentName}.`,
      "Vous y recevrez les messages de l'institut : absences, validations, besoins de matériel.",
      "",
      "في أمان الله",
    ].join("\n"),
  );

  return Response.json({ ok: true, handled: true });
}
