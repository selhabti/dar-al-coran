import "server-only";

import {
  type BatchSummary,
  type OutgoingMessage,
  getBatchSummary,
  markMessageFailed,
  markMessageSent,
  recordMessages,
} from "@/lib/data/messages";
import { sendTelegramMessage, telegramConfigured } from "@/lib/telegram/client";

const DELAY_BETWEEN_SENDS_MS = 250;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchBatch(input: {
  kind: "groupe" | "direct";
  cohortId: string | null;
  sessionId: string | null;
  messages: OutgoingMessage[];
}): Promise<BatchSummary> {
  const batchId = crypto.randomUUID();
  const records = await recordMessages({ ...input, batchId });

  if (!telegramConfigured()) {
    for (const record of records) {
      if (record.status === "en_attente") {
        await markMessageFailed(record.id, "TELEGRAM_BOT_TOKEN absent");
      }
    }
    return getBatchSummary(batchId);
  }

  const handledChats = new Set<string>();

  for (const record of records) {
    if (record.status !== "en_attente") continue;
    const chatId = record.telegram_chat_id;
    if (!chatId) {
      await markMessageFailed(record.id, "aucune conversation Telegram liee");
      continue;
    }
    if (handledChats.has(chatId)) {
      await markMessageFailed(record.id, "conversation deja utilisee dans cet envoi");
      continue;
    }

    const result = await sendTelegramMessage(chatId, record.body);
    if (result.ok) {
      handledChats.add(chatId);
      await markMessageSent(record.id, result.messageId);
    } else {
      await markMessageFailed(record.id, result.error);
    }

    await wait(DELAY_BETWEEN_SENDS_MS);
  }

  return getBatchSummary(batchId);
}
