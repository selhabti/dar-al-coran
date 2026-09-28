import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { SignInForm } from "@/components/sign-in-form";
import { authConfigProblem } from "@/lib/auth";
import { getAuthUser } from "@/lib/session";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAuthUser()) redirect("/seances");

  const problem = authConfigProblem();

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent" />

      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <GraduationCap className="size-8" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Dar al-Coran</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Présences, validations et messages aux parents
        </p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-sm">
        {problem ? (
          <p className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-center text-sm text-warning">
            {problem}
          </p>
        ) : (
          <SignInForm />
        )}
      </div>
    </main>
  );
}
