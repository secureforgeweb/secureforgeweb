import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function findAppRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.name === "secureforgeweb_web") return dir;
      } catch {
        /* ignore */
      }
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

/** Carrega .env de secureforgeweb_web/ e, em seguida, da raiz do monorepo. */
export function loadProjectEnv(metaUrl) {
  const fileDir = path.dirname(fileURLToPath(metaUrl));
  const appRoot = findAppRoot(fileDir);
  const repoRoot = path.resolve(appRoot, "..");

  for (const envPath of [path.join(appRoot, ".env"), path.join(repoRoot, ".env")]) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
}
