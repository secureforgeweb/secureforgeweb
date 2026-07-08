import { loadProjectEnv } from "./loadProjectEnv.mjs";
import { syncAsvsCatalog } from "../src/services/asvsCatalog.js";

loadProjectEnv(import.meta.url);

async function main() {
  const force = process.argv.includes("--force");
  console.log("Sincronizando catálogo OWASP ASVS…");
  const result = await syncAsvsCatalog({ force });
  console.log(`Versão em uso: ${result.currentVersion}`);
  console.log(`Última release GitHub: ${result.latestReleaseTag ?? "indisponível"}`);
  for (const row of result.results) {
    console.log(
      `[${row.profile}] checklistId=${row.checklistId} items=${row.itemCount} ${row.created ? "criado" : "sem alteração"}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
