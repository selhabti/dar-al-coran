"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  addGuardianAction,
  regenerateLinkCodeAction,
  removeGuardianAction,
  unlinkGuardianAction,
  updateGuardianAction,
} from "@/server/actions/roster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Guardian } from "@/lib/types";

function inviteUrl(botUsername: string, code: string): string {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(code)}`;
}

export function GuardianManager({
  studentId,
  guardians,
  botUsername,
}: {
  studentId: string;
  guardians: Guardian[];
  botUsername: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelation, setNewRelation] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRelation, setEditRelation] = useState("");
  const [editPhone, setEditPhone] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Action impossible");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  function addGuardian() {
    if (!newName.trim()) {
      toast.error("Nom du parent requis");
      return;
    }
    run(
      () =>
        addGuardianAction({
          studentId,
          fullName: newName.trim(),
          relation: newRelation.trim() || null,
          phone: newPhone.trim() || null,
        }),
      "Parent ajouté",
    );
    setNewName("");
    setNewRelation("");
    setNewPhone("");
    setAdding(false);
  }

  function saveEdit(guardianId: string) {
    if (!editName.trim()) {
      toast.error("Nom du parent requis");
      return;
    }
    run(
      () =>
        updateGuardianAction({
          guardianId,
          fullName: editName.trim(),
          relation: editRelation.trim() || null,
          phone: editPhone.trim() || null,
        }),
      "Parent mis à jour",
    );
    setEditingId(null);
  }

  async function copyLink(code: string) {
    if (!botUsername) {
      toast.error("TELEGRAM_BOT_USERNAME absent");
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl(botUsername, code));
      toast.success("Lien de connexion copié");
    } catch {
      toast.error("Copie impossible");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {guardians.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          Aucun parent enregistré.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {guardians.map((guardian) => {
            const linked = guardian.telegram_chat_id !== null;
            const isEditing = editingId === guardian.id;
            return (
              <li key={guardian.id} className="rounded-xl border p-3">
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <Input
                      value={editName}
                      maxLength={120}
                      onChange={(event) => setEditName(event.target.value)}
                      aria-label="Nom du parent"
                    />
                    <Input
                      value={editRelation}
                      maxLength={40}
                      placeholder="Relation (père, mère…)"
                      onChange={(event) => setEditRelation(event.target.value)}
                      aria-label="Relation"
                    />
                    <Input
                      value={editPhone}
                      maxLength={30}
                      type="tel"
                      placeholder="Téléphone"
                      onChange={(event) => setEditPhone(event.target.value)}
                      aria-label="Téléphone"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Annuler
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(guardian.id)} disabled={pending}>
                        <Check />
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {guardian.full_name}
                          {guardian.is_primary ? (
                            <Badge variant="secondary" className="h-4">
                              principal
                            </Badge>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {guardian.phone ? `${guardian.phone} · ` : ""}
                          {guardian.relation ? `${guardian.relation} · ` : ""}
                          {linked
                            ? guardian.telegram_username
                              ? `lié (@${guardian.telegram_username})`
                              : "lié à Telegram"
                            : "non lié"}
                        </p>
                      </div>
                      <Badge variant={linked ? "default" : "outline"} className="shrink-0">
                        {linked ? "Actif" : "En attente"}
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => copyLink(guardian.link_code)}
                        disabled={!botUsername}
                        title={
                          botUsername
                            ? "Copier le lien de connexion Telegram"
                            : "TELEGRAM_BOT_USERNAME absent"
                        }
                      >
                        <Copy />
                        Copier le lien
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(guardian.id);
                          setEditName(guardian.full_name);
                          setEditRelation(guardian.relation ?? "");
                          setEditPhone(guardian.phone ?? "");
                        }}
                      >
                        <Pencil />
                        Modifier
                      </Button>
                      {linked ? (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() =>
                            run(
                              () => unlinkGuardianAction(guardian.id),
                              "Compte Telegram dissocié",
                            )
                          }
                        >
                          <Unlink />
                          Dissocier
                        </Button>
                      ) : null}
                      <Button
                        size="xs"
                        variant="ghost"
                        title="Générer un nouveau code de connexion"
                        onClick={() =>
                          run(
                            () => regenerateLinkCodeAction(guardian.id),
                            "Nouveau code généré",
                          )
                        }
                      >
                        <RefreshCw />
                        Nouveau code
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() =>
                          run(() => removeGuardianAction(guardian.id), "Parent supprimé")
                        }
                      >
                        <Trash2 />
                        Supprimer
                      </Button>
                    </div>

                    {!linked && botUsername ? (
                      <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-muted px-2 py-1.5 text-[0.7rem] text-muted-foreground">
                        <Link2 className="mt-0.5 size-3 shrink-0" />
                        <span className="break-all">
                          {inviteUrl(botUsername, guardian.link_code)}
                        </span>
                      </p>
                    ) : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-xl border p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guardian-name">Nom du parent</Label>
            <Input
              id="guardian-name"
              value={newName}
              maxLength={120}
              placeholder="Ex : Ahmed Ben Ali"
              onChange={(event) => setNewName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guardian-relation">Relation (facultatif)</Label>
            <Input
              id="guardian-relation"
              value={newRelation}
              maxLength={40}
              placeholder="père, mère, tuteur…"
              onChange={(event) => setNewRelation(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guardian-phone">Téléphone (facultatif)</Label>
            <Input
              id="guardian-phone"
              value={newPhone}
              maxLength={30}
              type="tel"
              placeholder="06 25 43 41 93"
              onChange={(event) => setNewPhone(event.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)} disabled={pending}>
              <X />
              Annuler
            </Button>
            <Button size="sm" onClick={addGuardian} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              Ajouter
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus />
          Ajouter un parent
        </Button>
      )}
    </div>
  );
}
