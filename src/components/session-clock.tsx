"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export function SessionClock({
  startsAt,
  endsAt,
}: {
  startsAt: string;
  endsAt: string | null;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const intervalId = setInterval(tick, 1000);
    const timeoutId = setTimeout(tick, 0);
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  const start = new Date(startsAt).getTime();
  const durationFallback = 90 * 60000;
  const end = endsAt ? new Date(endsAt).getTime() : start + durationFallback;
  const total = Math.max(end - start, 1);

  const currentMs = now ?? start;
  const elapsed = Math.min(Math.max(currentMs - start, 0), total);
  const remaining = Math.max(end - currentMs, 0);
  const progress = Math.min(Math.max(elapsed / total, 0), 1);

  const before = now !== null && currentMs < start;
  const finished = now !== null && currentMs >= end;

  const timeLabel =
    now === null
      ? "--:--:--"
      : new Intl.DateTimeFormat("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Europe/Paris",
        }).format(new Date(currentMs));

  const statusLabel = before
    ? `Commence dans ${formatDuration(start - currentMs)}`
    : finished
      ? "Séance terminée"
      : `Temps restant : ${formatDuration(remaining)}`;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-1">
        <div className="flex w-28 shrink-0 flex-col items-center rounded-xl bg-primary/10 py-2 text-primary">
          <Clock className="size-3.5" />
          <span className="font-mono text-xl font-semibold tabular-nums">{timeLabel}</span>
          <span className="text-[0.65rem] uppercase tracking-wide">Paris</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{statusLabel}</p>
          <p className="text-xs text-muted-foreground">
            Écoulé : {formatDuration(elapsed)} / {formatDuration(total)}
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
