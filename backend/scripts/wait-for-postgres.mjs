/**
 * Aguarda o PostgreSQL ficar disponível antes de rodar migrações/seeds.
 * Uso: node backend/scripts/wait-for-postgres.mjs
 */
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

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

async function main() {
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
      console.log(`[DB] Aguardando PostgreSQL (${attempt}/${maxAttempts}): ${message}`);
      if (attempt < maxAttempts) await sleep(delayMs);
    }
  }
  console.error("[DB] PostgreSQL indisponível. Verifique Docker ou instalação local.");
  process.exit(1);
}

main();
