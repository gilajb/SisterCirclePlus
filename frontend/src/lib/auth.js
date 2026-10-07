/**
 * lib/auth.js
 * Client-side auth helpers for SisterCircle+.
 *
 * Tokens live in localStorage and are attached to requests by the axios
 * interceptor (lib/api.js). The Django backend sets no httpOnly cookie, and a
 * cookie written from JS is exactly as readable by an XSS payload as
 * localStorage, so cookies would buy nothing here. All token reads/writes
 * should go through this module rather than touching localStorage directly,
 * so there's one place to change if that changes.
 *
 * Every function is safe to call during server rendering, where there is no
 * localStorage: reads return null and writes are no-ops.
 */

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

const hasStorage = () => typeof window !== "undefined";

/** Reads the JWT access token from localStorage. */
export function getToken() {
  return hasStorage() ? localStorage.getItem(ACCESS_KEY) : null;
}

/** Reads the JWT refresh token from localStorage. */
export function getRefreshToken() {
  return hasStorage() ? localStorage.getItem(REFRESH_KEY) : null;
}

/** Writes tokens to localStorage after login/signup. */
export function setToken(access, refresh) {
  if (!hasStorage()) return;
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) {
    localStorage.setItem(REFRESH_KEY, refresh);
  }
}

/** Clears both tokens on logout / auth failure. */
export function removeToken() {
  if (!hasStorage()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * True if an access token exists AND it is not expired.
 * Use for UI gating only — the server validates the real JWT.
 */
export function isLoggedIn() {
  if (!getToken()) return false;
  return !isTokenExpired();
}

/**
 * Decodes the JWT payload without signature verification.
 * Useful for reading claims (is_chw, tier, exp, iat).
 */
export function decodePayload() {
  try {
    const token = getToken();
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

/**
 * Returns true if the access token's `exp` claim is in the past.
 * Also returns true if the token cannot be decoded.
 */
export function isTokenExpired() {
  const payload = decodePayload();
  if (!payload?.exp) return true;
  // Add a 30-second buffer to account for clock skew
  return Date.now() >= (payload.exp - 30) * 1000;
}
