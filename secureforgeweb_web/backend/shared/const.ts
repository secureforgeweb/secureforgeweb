export const COOKIE_NAME = "app_session_id";
/** @deprecated Prefer SESSION_TTL_MS for auth cookies/JWT. Kept for legacy OAuth helpers. */
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
/** Session JWT + cookie lifetime (8 hours). */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
