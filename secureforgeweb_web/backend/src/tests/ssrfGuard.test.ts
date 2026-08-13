import { describe, expect, it } from "vitest";
import {
  assertAssessmentUrlPolicy,
  classifyIpAddress,
  isBlockedAssessmentAddress,
} from "../services/ssrfGuard.js";

describe("ssrfGuard — classifyIpAddress", () => {
  it("classifica loopback, privado, metadados e público", () => {
    expect(classifyIpAddress("127.0.0.1")).toBe("loopback");
    expect(classifyIpAddress("10.0.0.8")).toBe("private");
    expect(classifyIpAddress("192.168.1.10")).toBe("private");
    expect(classifyIpAddress("172.16.5.1")).toBe("private");
    expect(classifyIpAddress("169.254.169.254")).toBe("metadata");
    expect(classifyIpAddress("::ffff:169.254.169.254")).toBe("metadata");
    expect(classifyIpAddress("8.8.8.8")).toBe("public");
  });
});

describe("ssrfGuard — isBlockedAssessmentAddress", () => {
  it("bloqueia metadados e privados; permite loopback e público", () => {
    expect(isBlockedAssessmentAddress("169.254.169.254", { allowPrivate: false })).toBe(true);
    expect(isBlockedAssessmentAddress("10.1.2.3", { allowPrivate: false })).toBe(true);
    expect(isBlockedAssessmentAddress("10.1.2.3", { allowPrivate: true })).toBe(false);
    expect(isBlockedAssessmentAddress("127.0.0.1", { allowPrivate: false })).toBe(false);
    expect(isBlockedAssessmentAddress("1.1.1.1", { allowPrivate: false })).toBe(false);
  });
});

describe("ssrfGuard — assertAssessmentUrlPolicy", () => {
  it("rejeita file:// e metadados cloud", () => {
    expect(() => assertAssessmentUrlPolicy("file:///etc/passwd")).toThrow(/HTTP ou HTTPS/);
    expect(() => assertAssessmentUrlPolicy("http://169.254.169.254/latest/meta-data")).toThrow(
      /bloqueado/
    );
    expect(() => assertAssessmentUrlPolicy("http://metadata.google.internal/")).toThrow(/bloqueado/);
    expect(() => assertAssessmentUrlPolicy("http://192.168.0.1/admin")).toThrow(/bloqueado/);
  });

  it("permite HTTPS público e loopback local", () => {
    expect(assertAssessmentUrlPolicy("https://example.com/app").hostname).toBe("example.com");
    expect(assertAssessmentUrlPolicy("http://127.0.0.1:5173").hostname).toBe("127.0.0.1");
    expect(assertAssessmentUrlPolicy("http://localhost:5173").hostname).toBe("localhost");
  });
});
