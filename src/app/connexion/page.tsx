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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GraduationCap className="size-6" />
        </span>
        <h1 className="text-xl font-semibold">Institut</h1>
        <p className="text-sm text-muted-foreground">
          Presences, validations et messages aux parents
        </p>
      </div>

      {problem ? (
        <p className="max-w-sm rounded-lg border border-warning/40 bg-warning/10 p-3 text-center text-sm text-warning-foreground">
          {problem}
        </p>
      ) : (
        <SignInForm />
      )}
    </main>
  );
}
