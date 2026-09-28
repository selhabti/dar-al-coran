"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { archiveStudentAction, updateStudentAction } from "@/server/actions/roster";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StudentActions({
  student,
}: {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    birthdate: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [firstName, setFirstName] = useState(student.first_name);
  const [lastName, setLastName] = useState(student.last_name);
  const [birthdate, setBirthdate] = useState(student.birthdate ?? "");
  const [city, setCity] = useState(student.city ?? "");
  const [email, setEmail] = useState(student.email ?? "");
  const [phone, setPhone] = useState(student.phone ?? "");

  function save() {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Prénom et nom requis");
      return;
    }
    startTransition(async () => {
      const result = await updateStudentAction({
        studentId: student.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthdate: birthdate ? birthdate : null,
        city: city.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Fiche mise à jour");
      setEditOpen(false);
      router.refresh();
    });
  }

  function archive() {
    startTransition(async () => {
      const result = await archiveStudentAction(student.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Élève archivé");
      setArchiveOpen(false);
      router.push("/eleves");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil />
        Modifier
      </Button>
      <Button variant="outline" size="sm" onClick={() => setArchiveOpen(true)}>
        <Archive />
        Archiver
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la fiche</DialogTitle>
            <DialogDescription>Corrigez les informations de l&apos;élève.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-first">Prénom</Label>
                <Input
                  id="edit-first"
                  value={firstName}
                  maxLength={80}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-last">Nom</Label>
                <Input
                  id="edit-last"
                  value={lastName}
                  maxLength={80}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-birth">Date de naissance</Label>
              <Input
                id="edit-birth"
                type="date"
                value={birthdate}
                onChange={(event) => setBirthdate(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-city">Ville de résidence</Label>
                <Input
                  id="edit-city"
                  value={city}
                  maxLength={80}
                  onChange={(event) => setCity(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-phone">Téléphone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={phone}
                  maxLength={30}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                maxLength={160}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archiver cet élève ?</DialogTitle>
            <DialogDescription>
              L&apos;élève n&apos;apparaîtra plus dans les listes ni dans les pointages. Son historique est
              conservé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={archive} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Archive />}
              Archiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
