import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSql } from "@/lib/db";
import type { Teacher } from "@/lib/types";

export async function getAuthUser() {
  const { data, error } = await auth.getSession();
  if (error || !data?.user) return null;
  return data.user;
}

export async function requireTeacher(): Promise<Teacher> {
  const user = await getAuthUser();
  if (!user) redirect("/connexion");

  const rows = await getSql()`
    insert into teachers (id, email, full_name)
    values (${user.id}, ${user.email ?? ""}, ${user.name ?? "Professeur"})
    on conflict (id) do update set
      email = excluded.email,
      full_name = excluded.full_name
    returning id, email, full_name
  `;
  return rows[0] as unknown as Teacher;
}
