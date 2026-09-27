import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatFullDate(value: string | Date): string {
  return format(toDate(value), "d MMMM yyyy", { locale: fr });
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
