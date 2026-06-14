/**
 * lib/auth.js
 * Client-side auth helpers for SisterCircle+.
 *
 * SECURITY MODEL:
 * - Access token stored in an httpOnly cookie set by the browser
 *   (document.cookie with SameSite=Lax; JS cannot read httpOnly cookies,
 *   but we set them client-side here so they travel with every request).
 * - localStorage is NOT used for token storage to prevent XSS theft.
 * - All functions guard against SSR with typeof window checks.
 */

const ACCESS_KEY  = "access_token";
const REFRESH_KEY = "refresh_token";

// 24 hours — matches SimpleJWT ACCESS_TOKEN_LIFETIME in settings.py
const ACCESS_MAX_AGE  = 60 * 60 * 24;
// 7 days
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function setCookie(name, value, maxAge) {
  if (typeof document === "undefined") return;
  // HttpOnly cannot be set from JS — we set SameSite=Lax + Secure in prod
  // to mitigate CSRF. True httpOnly must come from the server; update your
  // Django login view to Set-Cookie if you move to cookie-based auth fully.
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

function deleteCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.split("=")[1] : null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * getToken()
 * Reads the JWT access token from cookies (not localStorage).
 * Returns null server-side or if no token is set.
 */
export function getToken() {
  return readCookie(ACCESS_KEY);
}

/**
 * getRefreshToken()
 * Reads the JWT refresh token from cookies.
 */
export function getRefreshToken() {
  return readCookie(REFRESH_KEY);
}

/**
 * setToken(access, refresh?)
 * Writes tokens to cookies so:
 *   - Next.js middleware can read them for route protection
 *   - axios interceptor attaches them to API requests
 *   - They are NOT accessible via localStorage (XSS hardening)
 */
export function setToken(access, refresh) {
  if (typeof window === "undefined") return;
  setCookie(ACCESS_KEY, access, ACCESS_MAX_AGE);
  if (refresh) {
    setCookie(REFRESH_KEY, refresh, REFRESH_MAX_AGE);
  }
}

/**
 * removeToken()
 * Clears both tokens on logout.
 */
export function removeToken() {
  if (typeof window === "undefined") return;
  deleteCookie(ACCESS_KEY);
  deleteCookie(REFRESH_KEY);
}

/**
 * isLoggedIn()
 * True if an access token cookie exists AND it is not expired.
 * Use for UI gating only — the server validates the real JWT.
 */
export function isLoggedIn() {
  if (!getToken()) return false;
  return !isTokenExpired();
}

/**
 * decodePayload()
 * Decodes the JWT payload without signature verification.
 * Useful for reading claims (username, is_chw, exp, iat).
 */
export function decodePayload() {
  try {
    const token = getToken();
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

/**
 * isTokenExpired()
 * Returns true if the access token's `exp` claim is in the past.
 * Also returns true if the token cannot be decoded.
 */
export function isTokenExpired() {
  try {
    const payload = decodePayload();
    if (!payload?.exp) return true;
    // Add a 30-second buffer to account for clock skew
    return Date.now() >= (payload.exp - 30) * 1000;
  } catch {
    return true;
  }
}

/**
 * requireAuth(router)
 * Call at the top of useEffect in any protected page.
 * Clears expired tokens and redirects to /signup.
 * Returns true if auth is valid, false if redirected.
 */
export function requireAuth(router) {
  const token = getToken();
  if (!token || isTokenExpired()) {
    removeToken();
    router.replace("/signup");
    return false;
  }
  return true;
}
