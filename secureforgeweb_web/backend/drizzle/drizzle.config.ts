import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "drizzle-kit";
// @ts-expect-error mjs helper without type declarations
import { loadProjectEnv } from "../scripts/loadProjectEnv.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
loadProjectEnv(import.meta.url);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: path.join(dir, "schema.ts"),
  out: dir,
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
