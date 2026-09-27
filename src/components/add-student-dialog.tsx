"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { addStudentAction } from "@/server/actions/roster";
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
import type { Cohort } from "@/lib/types";

export function AddStudentDialog({ cohorts }: { cohorts: Cohort[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");

  function submit() {
    if (!cohortId) {
      toast.error("Choisissez un groupe");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Prénom et nom requis");
      return;
    }

    startTransition(async () => {
      const result = await addStudentAction({
        cohortId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthdate: birthdate ? birthdate : null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Élève ajouté");
      setOpen(false);
      setFirstName("");
      setLastName("");
      setBirthdate("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <UserPlus />
          Ajouter un élève
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" />
            Nouvel élève
          </DialogTitle>
          <DialogDescription>
            Renseignez l&apos;identité de l&apos;élève, puis ajoutez ses parents depuis sa fiche.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {cohorts.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="student-cohort">Groupe</Label>
              <select
                id="student-cohort"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="student-first">Prénom</Label>
              <Input
                id="student-first"
                value={firstName}
                maxLength={80}
                autoComplete="off"
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="student-last">Nom</Label>
              <Input
                id="student-last"
                value={lastName}
                maxLength={80}
                autoComplete="off"
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="student-birthdate">Date de naissance (facultatif)</Label>
            <Input
              id="student-birthdate"
              type="date"
              value={birthdate}
              onChange={(event) => setBirthdate(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
