import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin, type ServerOptions } from "vite";

const frontendRoot = path.resolve(import.meta.dirname, "..");
const projectRoot = path.resolve(frontendRoot, "..");
const repoRoot = path.resolve(projectRoot, "..");

function resolveCertPath(value: string | undefined, fallbackRelative: string): string | undefined {
  const candidate = value?.trim() || fallbackRelative;
  const absolute = path.isAbsolute(candidate)
    ? candidate
    : path.resolve(projectRoot, candidate);
  return fs.existsSync(absolute) ? absolute : undefined;
}

/** HEADER-* helpers for local HTTPS demos (Vite does not use Helmet). */
function secureHeadersPlugin(enabled: boolean): Plugin {
  return {
    name: "secureforge-dev-security-headers",
    configureServer(server) {
      if (!enabled) return;
      server.middlewares.use((_req, res, next) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
        res.setHeader(
          "Content-Security-Policy",
          [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'self'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data: https:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "connect-src 'self' https: wss: ws:",
          ].join("; ")
        );
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const rootEnv = loadEnv(mode, repoRoot, "");
  const merged = { ...rootEnv, ...env };
  const apiTarget = merged.VITE_API_PROXY_TARGET ?? "http://localhost:3000";

  const httpsEnabled = merged.VITE_DEV_HTTPS === "1";
  const secureHeaders =
    httpsEnabled || merged.ENABLE_SECURE_HEADERS === "1" || merged.NODE_ENV === "production";
  const cert = resolveCertPath(merged.HTTPS_CERT, "certs/localhost.pem");
  const key = resolveCertPath(merged.HTTPS_KEY, "certs/localhost-key.pem");

  let https: ServerOptions["https"] | undefined;
  if (httpsEnabled) {
    if (cert && key) {
      https = {
        cert: fs.readFileSync(cert),
        key: fs.readFileSync(key),
      };
    } else {
      console.warn(
        "[vite] VITE_DEV_HTTPS=1 mas certificados não encontrados em certs/localhost.pem (+ key). Rode scripts/setup-local-https.ps1"
      );
    }
  }

  return {
    plugins: [react(), tailwindcss(), jsxLocPlugin(), secureHeadersPlugin(secureHeaders)],
    resolve: {
      alias: {
        "@": path.resolve(frontendRoot, "src"),
        "@shared": path.resolve(projectRoot, "backend", "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },
    envDir: projectRoot,
    root: frontendRoot,
    publicDir: path.resolve(frontendRoot, "public"),
    build: {
      outDir: path.resolve(frontendRoot, "dist"),
      emptyOutDir: true,
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      https,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
