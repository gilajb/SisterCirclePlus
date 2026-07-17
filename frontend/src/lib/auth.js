/**
 * lib/auth.js
 * Client-side auth helpers for SisterCircle+.
 *
 * Tokens live in localStorage and are attached to requests by the axios
 * interceptor (lib/axios.js). This is a client-only SPA with no
 * server-rendered routes to protect, so cookies buy nothing here — true
 * XSS-hardened storage would need the Django backend to set an httpOnly
 * cookie itself (it doesn't), and a cookie written from JS is exactly as
 * readable by an XSS payload as localStorage. All token reads/writes
 * should go through this module rather than touching localStorage directly,
 * so there's one place to change if that changes.
 */

const ACCESS_KEY  = "access_token";
const REFRESH_KEY = "refresh_token";

/**
 * getToken()
 * Reads the JWT access token from localStorage.
 */
export function getToken() {
  return localStorage.getItem(ACCESS_KEY);
}

/**
 * getRefreshToken()
 * Reads the JWT refresh token from localStorage.
 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

/**
 * setToken(access, refresh?)
 * Writes tokens to localStorage after login/signup.
 */
export function setToken(access, refresh) {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) {
    localStorage.setItem(REFRESH_KEY, refresh);
  }
}

/**
 * removeToken()
 * Clears both tokens on logout / auth failure.
 */
export function removeToken() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * isLoggedIn()
 * True if an access token exists AND it is not expired.
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
 * requireAuth(navigate)
 * Call at the top of useEffect in any protected page.
 * Clears expired tokens and redirects to /signup.
 * Returns true if auth is valid, false if redirected.
 */
export function requireAuth(navigate) {
  const token = getToken();
  if (!token || isTokenExpired()) {
    removeToken();
    navigate("/signup", { replace: true });
    return false;
  }
  return true;
}
