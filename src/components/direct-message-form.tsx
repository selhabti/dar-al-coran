"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { sendDirectMessageAction, type SendResultPayload } from "@/server/actions/messages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Guardian, MessageTemplate } from "@/lib/types";

export function DirectMessageForm({
  studentId,
  guardians,
  templates,
  telegramReady,
}: {
  studentId: string;
  guardians: Guardian[];
  templates: MessageTemplate[];
  telegramReady: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [guardianId, setGuardianId] = useState(guardians[0]?.id ?? "");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<SendResultPayload["batch"] | null>(null);

  function send() {
    if (!guardianId) {
      toast.error("Aucun parent destinataire");
      return;
    }
    if (!body.trim()) {
      toast.error("Le message est vide");
      return;
    }
    startTransition(async () => {
      const response = await sendDirectMessageAction({ studentId, guardianId, body });
      if (!response.ok || !response.batch) {
        toast.error(response.error ?? "Envoi impossible");
        return;
      }
      setResult(response.batch);
      const item = response.batch.items[0];
      if (item?.status === "envoye") toast.success("Message envoyé");
      else toast.warning(item?.error ?? "Message non envoyé");
      setBody("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="size-4 text-primary" />
          Message direct
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {guardians.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            Ajoutez un parent pour lui envoyer un message.
          </p>
        ) : (
          <>
            {!telegramReady ? (
              <p className="rounded-lg bg-warning/15 px-3 py-2 text-xs text-warning">
                Telegram non configuré (TELEGRAM_BOT_TOKEN absent). Les envois échoueront.
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="direct-guardian">Destinataire</Label>
              <select
                id="direct-guardian"
                value={guardianId}
                onChange={(event) => setGuardianId(event.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {guardians.map((guardian) => (
                  <option key={guardian.id} value={guardian.id}>
                    {guardian.full_name}
                    {guardian.telegram_chat_id ? "" : " (non lié)"}
                  </option>
                ))}
              </select>
            </div>

            {templates.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="direct-template">Modèle</Label>
                <select
                  id="direct-template"
                  value=""
                  onChange={(event) => {
                    const chosen = templates.find((item) => item.id === event.target.value);
                    if (chosen) setBody(chosen.body);
                  }}
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="">Choisir un modèle…</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Bonjour {{parent_name}}, …"
            />

            <div className="flex justify-end">
              <Button onClick={send} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Send />}
                Envoyer
              </Button>
            </div>

            {result && result.items[0]?.status !== "envoye" ? (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <X className="size-3" />
                {result.items[0]?.error ?? "Échec de l'envoi"}
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
