/**
 * followup.test.ts — Artefactos de documentação da SecureForge Web (postura)
 *
 * Cobre:
 *  FU-6  Diagrama de arquitetura (PNG) e referências no README da raiz
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const repoRoot = path.resolve(__dirname, "../../../../");
const webRoot = path.resolve(__dirname, "../../../");

describe("FU-6: Diagrama de Arquitetura", () => {
  it("FU-6.1: PNG de arquitetura existe em docs/screenshots", () => {
    const pngPath = path.join(webRoot, "docs/screenshots/arquitetura.png");
    expect(fs.existsSync(pngPath)).toBe(true);
    expect(fs.statSync(pngPath).size).toBeGreaterThan(10_000);
  });

  it("FU-6.2: README da raiz referencia arquitetura e o PNG", () => {
    const readmePath = path.join(repoRoot, "README.md");
    expect(fs.existsSync(readmePath)).toBe(true);
    const content = fs.readFileSync(readmePath, "utf-8");
    expect(content.toLowerCase()).toMatch(/arquitetura/);
    expect(content).toContain("docs/screenshots/arquitetura.png");
  });

  it("FU-6.3: README descreve frontend, backend e PostgreSQL", () => {
    const content = fs.readFileSync(path.join(repoRoot, "README.md"), "utf-8");
    expect(content).toMatch(/React|frontend/i);
    expect(content).toMatch(/Node\.js|Express|backend/i);
    expect(content).toMatch(/PostgreSQL/i);
    expect(content).toMatch(/tRPC|Drizzle/i);
  });

  it("FU-6.4: README documenta portas 3000 e 5173", () => {
    const content = fs.readFileSync(path.join(repoRoot, "README.md"), "utf-8");
    expect(content).toContain("3000");
    expect(content).toContain("5173");
  });
});
