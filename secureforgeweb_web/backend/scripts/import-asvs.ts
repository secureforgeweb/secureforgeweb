import { loadProjectEnv } from "./loadProjectEnv.mjs";
import { importAllAsvsChecklists } from "../src/services/asvsCatalog.js";

loadProjectEnv(import.meta.url);

async function main() {
  const force = process.argv.includes("--force");
  console.log("Importando catálogo OWASP ASVS 5.0…");
  const results = await importAllAsvsChecklists({ force });
  for (const result of results) {
    console.log(
      `[${result.profile}] checklistId=${result.checklistId} items=${result.itemCount} categories=${result.categoryCount} version=${result.sourceVersion} ${result.created ? "(criado)" : "(atualizado)"}`
    );
  }
  console.log("Import ASVS concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
