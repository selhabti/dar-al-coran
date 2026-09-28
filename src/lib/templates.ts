import type { Attendance } from "@/lib/types";

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  present: "Présent",
  retard: "En retard",
  absent_justifie: "Absent justifié",
  absent_non_justifie: "Absent non justifié",
  inconnu: "Non renseigné",
};

export const VALIDATION_LABELS: Record<"true" | "false" | "none", string> = {
  true: "Oui",
  false: "Non",
  none: "Non évalué",
};

export interface TemplateVariables {
  student_first_name: string;
  student_last_name: string;
  parent_name: string;
  attendance_label: string;
  validation_label: string;
  comment: string;
  comment_line: string;
  session_date: string;
  session_title: string;
  cohort_name: string;
  teacher_first_name: string;
  teacher_full_name: string;
  [key: string]: string;
}

export const TEMPLATE_VARIABLES: { key: keyof TemplateVariables; label: string }[] = [
  { key: "student_first_name", label: "Prénom de l'élève" },
  { key: "student_last_name", label: "Nom de l'élève" },
  { key: "parent_name", label: "Prénom du parent" },
  { key: "attendance_label", label: "Statut de présence" },
  { key: "validation_label", label: "Cours validé" },
  { key: "comment", label: "Commentaire" },
  { key: "comment_line", label: "Ligne de commentaire (masquée si vide)" },
  { key: "session_date", label: "Date de la séance" },
  { key: "session_title", label: "Titre de la séance" },
  { key: "cohort_name", label: "Nom du groupe" },
  { key: "teacher_first_name", label: "Prénom du professeur" },
  { key: "teacher_full_name", label: "Nom du professeur" },
];

const VARIABLE_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/gi;

export function renderTemplate(body: string, variables: Record<string, string>): string {
  return body
    .replace(VARIABLE_PATTERN, (match, key: string) => {
      const value = variables[key];
      return value === undefined || value === "" ? "" : value;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function unknownVariables(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    found.add(match[1]);
  }
  return [...found];
}
