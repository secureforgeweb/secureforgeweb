import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Loopback is allowed so local labs (localhost:5173 / :3000) remain assessable. */
const ALLOW_LOOPBACK = true;

const METADATA_HOSTS = new Set([
  "metadata",
  "metadata.google.internal",
  "metadata.google.com",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

function envFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function allowPrivateAssessmentTargets(): boolean {
  return envFlag("ALLOW_PRIVATE_ASSESSMENT");
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const oct = Number(part);
    if (oct < 0 || oct > 255) return null;
    n = (n << 8) + oct;
  }
  return n >>> 0;
}

function ipv4InCidr(ip: string, base: string, bits: number): boolean {
  const ipN = ipv4ToInt(ip);
  const baseN = ipv4ToInt(base);
  if (ipN === null || baseN === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipN & mask) === (baseN & mask);
}

function expandIpv6(ip: string): string[] | null {
  const lower = ip.toLowerCase();
  if (lower.includes(".")) {
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return null;
  }
  let [head, tail] = lower.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  if (headParts.length + tailParts.length > 8) return null;
  const missing = 8 - headParts.length - tailParts.length;
  const parts = [...headParts, ...Array(Math.max(0, missing)).fill("0"), ...tailParts];
  if (parts.length !== 8) return null;
  return parts.map((p) => p.padStart(4, "0"));
}

function isIpv4MappedIpv6(ip: string): string | null {
  const m = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return m?.[1] ?? null;
}

export type AddressClass = "loopback" | "link_local" | "private" | "metadata" | "public";

export function classifyIpAddress(ip: string): AddressClass {
  const mapped = isIpv4MappedIpv6(ip);
  if (mapped) return classifyIpAddress(mapped);

  const version = isIP(ip);
  if (version === 4) {
    if (ipv4InCidr(ip, "127.0.0.0", 8)) return "loopback";
    if (ipv4InCidr(ip, "169.254.0.0", 16)) return "metadata";
    if (
      ipv4InCidr(ip, "10.0.0.0", 8) ||
      ipv4InCidr(ip, "172.16.0.0", 12) ||
      ipv4InCidr(ip, "192.168.0.0", 16) ||
      ipv4InCidr(ip, "100.64.0.0", 10)
    ) {
      return "private";
    }
    if (
      ipv4InCidr(ip, "0.0.0.0", 8) ||
      ipv4InCidr(ip, "224.0.0.0", 4) ||
      ipv4InCidr(ip, "240.0.0.0", 4)
    ) {
      return "metadata";
    }
    return "public";
  }

  if (version === 6) {
    const parts = expandIpv6(ip);
    if (!parts) return "metadata";
    if (parts.join(":") === "0000:0000:0000:0000:0000:0000:0000:0001") return "loopback";
    const first = parseInt(parts[0], 16);
    if ((first & 0xffc0) === 0xfe80) return "link_local";
    if ((first & 0xfe00) === 0xfc00) return "private";
    return "public";
  }

  return "metadata";
}

export function isBlockedAssessmentAddress(
  ip: string,
  opts?: { allowPrivate?: boolean }
): boolean {
  const allowPrivate = opts?.allowPrivate ?? allowPrivateAssessmentTargets();
  const kind = classifyIpAddress(ip);
  if (kind === "public") return false;
  if (kind === "loopback") return !ALLOW_LOOPBACK;
  if (kind === "private") return !allowPrivate;
  return true;
}

function hostnameLooksLikeMetadata(hostname: string): boolean {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  if (METADATA_HOSTS.has(host)) return true;
  if (host.endsWith(".metadata.google.internal")) return true;
  return false;
}

export function assertAssessmentUrlPolicy(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL de avaliação inválida");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("A URL deve usar HTTP ou HTTPS");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (hostnameLooksLikeMetadata(host)) {
    throw new Error("Destino bloqueado: hostname de metadados/infraestrutura");
  }
  if (isIP(host)) {
    if (isBlockedAssessmentAddress(host)) {
      throw new Error(
        "Destino bloqueado: endereço privado, link-local ou de metadados (SSRF)"
      );
    }
  }
  return url;
}

export type ResolvedAssessmentTarget = {
  url: URL;
  addresses: string[];
};

export async function assertResolvedAssessmentTarget(
  rawUrl: string
): Promise<ResolvedAssessmentTarget> {
  const url = assertAssessmentUrlPolicy(rawUrl);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) {
    return { url, addresses: [host] };
  }

  if (host === "localhost") {
    return { url, addresses: ["127.0.0.1"] };
  }

  const skipDns =
    process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  if (skipDns) {
    return { url, addresses: [] };
  }

  let records: Array<{ address: string }>;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error(`Não foi possível resolver o hostname: ${host}`);
  }
  if (!records.length) {
    throw new Error(`Não foi possível resolver o hostname: ${host}`);
  }
  const blocked = records
    .map((r) => r.address)
    .filter((addr) => isBlockedAssessmentAddress(addr));
  if (blocked.length > 0) {
    throw new Error(
      "Destino bloqueado após resolução DNS: endereço privado, link-local ou de metadados (SSRF / DNS rebinding)"
    );
  }
  return { url, addresses: records.map((r) => r.address) };
}
