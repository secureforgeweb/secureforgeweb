/**
 * Aguarda o PostgreSQL ficar disponível antes de rodar migrações/seeds.
 * Uso: node backend/scripts/wait-for-postgres.mjs
 *
 * Não cria a base: use `docker compose up -d` ou `scripts/init-postgres.sql`.
 */
import pg from "pg";
import { loadProjectEnv } from "./loadProjectEnv.mjs";

loadProjectEnv(import.meta.url);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[DB] DATABASE_URL não definida. Copie .env.example para .env");
  process.exit(1);
}

const maxAttempts = Number(process.env.DB_WAIT_ATTEMPTS ?? 30);
const delayMs = Number(process.env.DB_WAIT_DELAY_MS ?? 2000);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hintForError(message) {
  const lower = message.toLowerCase();
  if (lower.includes("does not exist") && lower.includes("database")) {
    return (
      "[DB] A base da DATABASE_URL ainda não existe. " +
      "Crie-a com `docker compose up -d` (cria secureforgeweb) " +
      "ou `psql -U postgres -f scripts/init-postgres.sql`, " +
      "e mantenha o nome igual ao do .env.example (secureforgeweb)."
    );
  }
  if (
    lower.includes("password authentication failed") ||
    (lower.includes("role") && lower.includes("does not exist"))
  ) {
    return (
      "[DB] Utilizador/senha da DATABASE_URL não coincidem com o Postgres. " +
      "Com Docker use o .env.example; com instalação local rode scripts/init-postgres.sql."
    );
  }
  return null;
}

async function main() {
  let lastMessage = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await pool.query("SELECT 1");
      await pool.end();
      console.log(`[DB] PostgreSQL disponível (tentativa ${attempt}/${maxAttempts})`);
      return;
    } catch (error) {
      await pool.end().catch(() => undefined);
      const message = error instanceof Error ? error.message : String(error);
      lastMessage = message;
      console.log(`[DB] Aguardando PostgreSQL (${attempt}/${maxAttempts}): ${message}`);
      if (attempt < maxAttempts) await sleep(delayMs);
    }
  }
  console.error("[DB] PostgreSQL indisponível. Verifique Docker ou instalação local.");
  const hint = hintForError(lastMessage);
  if (hint) console.error(hint);
  process.exit(1);
}

main();
