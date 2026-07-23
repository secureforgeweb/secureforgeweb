import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

function isLocalHostName(hostname: string | undefined): boolean {
  if (!hostname) return false;
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}

/**
 * Returns secure cookie options (req. 6.3):
 * - httpOnly: true  → inaccessible to JavaScript
 * - secure: true when request is HTTPS, or production behind non-local host
 * - sameSite: "lax" → CSRF protection while allowing top-level navigation
 * - saveUninitialized: false is enforced by only issuing the cookie on login
 *
 * Local HTTP (localhost) keeps working even if NODE_ENV=production.
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isProduction = process.env.NODE_ENV === "production";
  const host = req.hostname || req.headers.host;
  const local = isLocalHostName(typeof host === "string" ? host : undefined);
  const forceSecure = process.env.COOKIE_SECURE === "1";
  const forceInsecure = process.env.COOKIE_SECURE === "0";

  let secure = false;
  if (forceInsecure) {
    secure = false;
  } else if (forceSecure || isSecureRequest(req)) {
    secure = true;
  } else if (isProduction && !local) {
    secure = true;
  }

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
  };
}
