const API_ROOT = "https://api.telegram.org";

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string; retryAfterSeconds?: number };

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export function botUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "") ?? null;
}

export function inviteLink(linkCode: string): string {
  const username = botUsername();
  if (!username) return "";
  return `https://t.me/${username}?start=${encodeURIComponent(linkCode)}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callApi<T>(
  method: string,
  payload: Record<string, unknown>,
  attempt = 0,
): Promise<{ ok: true; result: T } | { ok: false; error: string; retryAfterSeconds?: number }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN absent" };

  let response: Response;
  try {
    response = await fetch(`${API_ROOT}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (attempt < 2) {
      await wait(400 * 2 ** attempt);
      return callApi<T>(method, payload, attempt + 1);
    }
    return { ok: false, error: `reseau indisponible: ${String(error)}` };
  }

  let body: { ok?: boolean; result?: T; description?: string; parameters?: { retry_after?: number } };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return { ok: false, error: `reponse Telegram invalide (${response.status})` };
  }

  if (body.ok && body.result !== undefined) {
    return { ok: true, result: body.result };
  }

  const retryAfterSeconds = body.parameters?.retry_after;
  const isRetryable = response.status === 429 || response.status >= 500;

  if (isRetryable && attempt < 3) {
    const delay = Math.min((retryAfterSeconds ?? 1) * 1000, 8000);
    await wait(delay);
    return callApi<T>(method, payload, attempt + 1);
  }

  return {
    ok: false,
    error: body.description ?? `erreur Telegram ${response.status}`,
    retryAfterSeconds,
  };
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<SendResult> {
  const result = await callApi<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
  if (!result.ok) return result;
  return { ok: true, messageId: String(result.result.message_id) };
}

export interface TelegramMessageUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
}

export async function replyToChat(chatId: string | number, text: string): Promise<SendResult> {
  return sendTelegramMessage(String(chatId), text);
}
