import { neon } from "@neondatabase/serverless";

export type Row = Record<string, unknown>;

type SqlClient = (strings: TemplateStringsArray, ...params: unknown[]) => Promise<Row[]>;

let client: SqlClient | null = null;

export function getSql(): SqlClient {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL absent. Ajoutez-la dans .env.local (chaine poolee, hostname contenant -pooler).",
      );
    }
    client = neon(connectionString) as unknown as SqlClient;
  }
  return client;
}

export type Sql = ReturnType<typeof getSql>;

export async function query<Row>(statement: TemplateStringsArray, ...params: unknown[]) {
  const rows = await getSql()(statement, ...params);
  return rows as unknown as Row[];
}
