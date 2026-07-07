import { describe, expect, it } from "vitest";
import { findCodeArtifact } from "../services/assessmentEvidence.js";

describe("assessmentEvidence", () => {
  it("findCodeArtifact retorna trecho numerado com arquivo e linha", () => {
    const files = [
      {
        path: "src/auth/password.ts",
        content: [
          "export function validate() {",
          "  return true;",
          "}",
          "",
          "export function hashPassword(pwd: string) {",
          "  return bcrypt.hash(pwd, 12);",
          "}",
        ].join("\n"),
      },
    ];

    const { evidence, artifact } = findCodeArtifact(/bcrypt\.hash/i, files, "Hash de senha");

    expect(evidence).toBe("src/auth/password.ts:6");
    expect(artifact?.kind).toBe("code");
    expect(artifact?.content).toContain("bcrypt.hash");
    expect(artifact?.content).toContain(">");
    expect(artifact?.lineStart).toBeLessThanOrEqual(6);
    expect(artifact?.lineEnd).toBeGreaterThanOrEqual(6);
  });
});
