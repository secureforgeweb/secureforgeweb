import "./loadEnv.js";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../controllers/index.js";
import { createContext } from "./context";
import { serveStatic } from "./vite.js";
import { applySecurityMiddleware, productionErrorHandler } from "../middleware/security.js";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  applySecurityMiddleware(app);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  registerOAuthRoutes(app);

  app.get("/api/health", async (_req, res) => {
    let database: "connected" | "disconnected" = "disconnected";
    try {
      const { getDb } = await import("../models/db.js");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (db) {
        await db.execute(sql`SELECT 1`);
        database = "connected";
      }
    } catch {
      database = "disconnected";
    }
    res.json({
      ok: database === "connected",
      service: "secure-forge-web-api",
      version: "0.3.0-phase2",
      database,
      checked_at: new Date().toISOString(),
    });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const frontendUrl = (process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "");
    app.get("/", (_req, res) => {
      res.redirect(302, frontendUrl);
    });
    app.get("/login", (_req, res) => {
      res.redirect(302, `${frontendUrl}/login`);
    });
  }

  app.use(productionErrorHandler);

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  let port = preferredPort;

  if (!process.env.JWT_SECRET?.trim()) {
    console.error("[API] JWT_SECRET não definido no .env — login e sessões não funcionam.");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "development") {
    if (!(await isPortAvailable(preferredPort))) {
      console.error(
        `[API] Porta ${preferredPort} em uso. Libere a porta ou defina PORT e VITE_API_PROXY_TARGET no .env.`
      );
      process.exit(1);
    }
  } else {
    port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }
  }

  server.listen(port, () => {
    const apiBase = `http://localhost:${port}`;
    console.log(`[SecureForge Web] API: ${apiBase} (rotas em /api/trpc)`);
    if (process.env.NODE_ENV === "development") {
      console.log(`[SecureForge Web] Frontend: ${process.env.FRONTEND_URL ?? "http://localhost:5173"}`);
    }
  });
}

startServer().catch(console.error);
