"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createSessionAction } from "@/server/actions/sessions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forDateTimeLocal } from "@/lib/format";
import type { Cohort } from "@/lib/types";

export function NewSessionDialog({ cohorts }: { cohorts: Cohort[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(() => forDateTimeLocal(new Date()));
  const [duration, setDuration] = useState("60");

  function submit() {
    if (!cohortId) {
      toast.error("Choisissez un groupe");
      return;
    }
    if (!startsAt) {
      toast.error("Renseignez la date et l'heure");
      return;
    }

    const durationMinutes = duration.trim() === "" ? null : Number.parseInt(duration, 10);
    if (durationMinutes !== null && (!Number.isFinite(durationMinutes) || durationMinutes <= 0)) {
      toast.error("Durée invalide");
      return;
    }

    startTransition(async () => {
      const result = await createSessionAction({
        cohortId,
        title: title.trim() || undefined,
        startsAt: new Date(startsAt).toISOString(),
        durationMinutes,
      });

      if (!result.ok || !result.sessionId) {
        toast.error(result.error ?? "Création impossible");
        return;
      }

      toast.success("Séance créée");
      setOpen(false);
      setTitle("");
      setStartsAt(forDateTimeLocal(new Date()));
      router.push(`/seances/${result.sessionId}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus />
          Nouvelle séance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="size-4 text-primary" />
            Nouvelle séance
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un groupe, puis renseignez la date et la durée de la séance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {cohorts.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-cohort">Groupe</Label>
              <select
                id="session-cohort"
                value={cohortId}
                onChange={(event) => setCohortId(event.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-title">Titre (facultatif)</Label>
            <Input
              id="session-title"
              value={title}
              maxLength={120}
              placeholder="Ex : Révision sourate Al-Mulk"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-starts">Date et heure</Label>
            <Input
              id="session-starts"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-duration">Durée (minutes)</Label>
            <Input
              id="session-duration"
              type="number"
              min={5}
              max={600}
              step={5}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Créer la séance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
