import { createNeonAuth } from "@neondatabase/auth/next/server";

const DEV_COOKIE_SECRET = "developpement-secret-32-caracteres-minimum";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? "https://placeholder.invalid",
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET ?? DEV_COOKIE_SECRET,
  },
});

export function authConfigProblem(): string | null {
  if (!process.env.NEON_AUTH_BASE_URL) {
    return "NEON_AUTH_BASE_URL absent. Copiez .env.example vers .env.local.";
  }
  if (!process.env.NEON_AUTH_COOKIE_SECRET) {
    return "NEON_AUTH_COOKIE_SECRET absent. Generez-la avec: openssl rand -base64 32";
  }
  return null;
}
