import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <WifiOff className="size-10 text-muted-foreground" />
      <h1 className="text-lg font-semibold">Connexion indisponible</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Cette page necessite une connexion internet. Verifiez votre reseau puis reessayez.
      </p>
    </main>
  );
}
