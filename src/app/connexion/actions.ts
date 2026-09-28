"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type SignInState = { error: string | null };

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Renseignez votre adresse e-mail et votre mot de passe." };
  }

  const { error } = await auth.signIn.email({ email, password });

  if (error) {
    return { error: "Identifiants incorrects." };
  }

  redirect("/seances");
}

export async function signOutAction() {
  await auth.signOut();
  redirect("/connexion");
}
