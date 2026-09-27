import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDir = join(rootDir, "migrations");

async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const content = await readFile(join(rootDir, file), "utf8");
      for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      }
    } catch {
      continue;
    }
  }
}

function splitStatements(sql) {
  const statements = [];
  let current = "";
  let index = 0;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null;

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];

    if (inLineComment) {
      if (char === "\n") inLineComment = false;
      current += char;
      index += 1;
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        current += "*/";
        index += 2;
        continue;
      }
      current += char;
      index += 1;
      continue;
    }

    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length;
        dollarTag = null;
        continue;
      }
      current += char;
      index += 1;
      continue;
    }

    if (inSingle) {
      current += char;
      if (char === "'") {
        if (next === "'") {
          current += next;
          index += 2;
          continue;
        }
        inSingle = false;
      }
      index += 1;
      continue;
    }

    if (inDouble) {
      current += char;
      if (char === '"') inDouble = false;
      index += 1;
      continue;
    }

    if (char === "-" && next === "-") {
      inLineComment = true;
      current += "--";
      index += 2;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      current += "/*";
      index += 2;
      continue;
    }

    if (char === "'") {
      inSingle = true;
      current += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inDouble = true;
      current += char;
      index += 1;
      continue;
    }

    if (char === "$") {
      const match = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(index));
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length;
        continue;
      }
    }

    if (char === ";") {
      if (current.trim()) statements.push(current.trim());
      current = "";
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function main() {
  await loadEnv();

  const connectionString =
    process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DIRECT_DATABASE_URL ou DATABASE_URL absent. Copiez .env.example vers .env.local.",
    );
    process.exit(1);
  }
  if (!process.env.DIRECT_DATABASE_URL) {
    console.warn(
      "DIRECT_DATABASE_URL absent: migration via la chaine poolée. Préférez la chaine directe.",
    );
  }

  const sql = neon(connectionString);
  await sql`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;

  const applied = await sql`select name from schema_migrations`;
  const alreadyApplied = new Set(applied.map((row) => row.name));

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  let appliedCount = 0;

  for (const file of files) {
    if (alreadyApplied.has(file)) {
      console.log(`  ignore  ${file}`);
      continue;
    }

    const statements = splitStatements(await readFile(join(migrationsDir, file), "utf8"));
    for (const statement of statements) {
      await sql.query(statement);
    }
    await sql`insert into schema_migrations (name) values (${file}) on conflict do nothing`;
    appliedCount += 1;
    console.log(`  applique ${file} (${statements.length} instructions)`);
  }

  console.log(
    appliedCount === 0
      ? "Base a jour, aucune migration en attente."
      : `${appliedCount} migration(s) appliquee(s).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
