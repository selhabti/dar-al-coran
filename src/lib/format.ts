import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatFullDate(value: string | Date): string {
  return format(toDate(value), "d MMMM yyyy", { locale: fr });
}

export function formatMonth(value: string | Date): string {
  return format(toDate(value), "MMMM", { locale: fr });
}

export function formatWeekday(value: string | Date): string {
  return format(toDate(value), "EEEE", { locale: fr });
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "d MMMM yyyy à HH:mm", { locale: fr });
}

export function formatShortDate(value: string | Date): string {
  return format(toDate(value), "dd/MM/yyyy", { locale: fr });
}

export function formatTime(value: string | Date): string {
  return format(toDate(value), "HH:mm", { locale: fr });
}

export function formatWeekdayTime(value: string | Date): string {
  return format(toDate(value), "EEEE d MMMM à HH:mm", { locale: fr });
}

export function firstNameOf(fullName: string | null | undefined): string {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0] ?? "";
}

export function fullNameOf(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function forDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const WEEKDAY_LABELS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
] as const;

export function weekdayLabel(weekday: number | null | undefined): string {
  if (weekday === null || weekday === undefined || weekday < 0 || weekday > 6) return "";
  return WEEKDAY_LABELS[weekday] ?? "";
}

export function formatTimeValue(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export function scheduleLabel(cohort: {
  weekday: number | null;
  start_time: string | null;
  end_time: string | null;
}): string {
  const day = weekdayLabel(cohort.weekday);
  const start = formatTimeValue(cohort.start_time);
  const end = formatTimeValue(cohort.end_time);
  if (!day || !start || !end) return "";
  return `Tous les ${day}s de ${start} à ${end}`;
}

export function formatTimeInZone(value: string | Date, timeZone = "Europe/Paris"): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(toDate(value));
}

export function formatDateTimeInZone(value: string | Date, timeZone = "Europe/Paris"): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(toDate(value));
}
