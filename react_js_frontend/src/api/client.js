/**
 * Simple API client using fetch and environment variables.
 * Respects REACT_APP_API_BASE or REACT_APP_BACKEND_URL.
 *
 * We normalize the base to avoid double slashes and allow optional /api prefix.
 * Backend mock FastAPI commonly exposes endpoints under `/api/*`:
 *   - /api/cars, /api/services, /api/parts, /api/service-centers
 *   - /api/profile, /api/auth/login
 * Health endpoint is typically `/` or `/healthz`.
 */

// Determine raw base from env with sensible default
const RAW_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:3001";

// Optional health path from env (defaults to "/")
const HEALTH_PATH = process.env.REACT_APP_HEALTHCHECK_PATH || "/";

// Helper to trim trailing slash
function trimTrailingSlash(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

// Decide whether to automatically prefix /api for non-absolute paths
// We keep frontend pages using logical paths like "/cars", and client will
// map them to "/api/cars" unless the caller already passes "/api/..."
const API_PREFIX = "/api";

function resolveUrl(path) {
  const base = trimTrailingSlash(RAW_BASE);
  // Ensure path starts with "/"
  const p = path.startsWith("/") ? path : `/${path}`;
  // If caller already used /api, don't double prefix
  const finalPath = p.startsWith(`${API_PREFIX}/`) ? p : `${API_PREFIX}${p}`;
  return `${base}${finalPath}`;
}

/**
// PUBLIC_INTERFACE
 * getApiBase - returns normalized API base URL (without trailing slash)
 */
export function getApiBase() {
  return trimTrailingSlash(RAW_BASE);
}

/**
// PUBLIC_INTERFACE
 * apiGet - Perform GET request to backend.
 * @param {string} path - endpoint path ("/cars" maps to "/api/cars")
 * @param {object} opts - optional fetch options
 */
export async function apiGet(path, opts = {}) {
  const url = resolveUrl(path);
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const t = await safeJson(res);
    const detail =
      t?.detail || t?.message || t?.error || (await res.text()).slice(0, 300);
    throw new Error(`GET ${path} failed (${res.status}): ${detail || "Unknown error"}`);
  }
  return res.json();
}

/**
// PUBLIC_INTERFACE
 * apiPost - Perform POST request to backend.
 * @param {string} path - endpoint path ("/auth/login" maps to "/api/auth/login")
 * @param {object} body - JSON body
 * @param {object} opts - optional fetch options
 */
export async function apiPost(path, body, opts = {}) {
  const url = resolveUrl(path);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    const t = await safeJson(res);
    const detail =
      t?.detail || t?.message || t?.error || (await res.text()).slice(0, 300);
    throw new Error(`POST ${path} failed (${res.status}): ${detail || "Unknown error"}`);
  }
  return res.json();
}

/**
// PUBLIC_INTERFACE
 * apiPut - Perform PUT request to backend.
 * @param {string} path
 * @param {object} body
 * @param {object} opts
 */
export async function apiPut(path, body, opts = {}) {
  const url = resolveUrl(path);
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    const t = await safeJson(res);
    const detail =
      t?.detail || t?.message || t?.error || (await res.text()).slice(0, 300);
    throw new Error(`PUT ${path} failed (${res.status}): ${detail || "Unknown error"}`);
  }
  return res.json();
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
// PUBLIC_INTERFACE
 * getAuthHeader - returns Authorization header if token present
 */
export function getAuthHeader() {
  const token = localStorage.getItem("access_token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
// PUBLIC_INTERFACE
 * apiHealth - Perform a healthcheck call to backend.
 * Uses REACT_APP_HEALTHCHECK_PATH or "/" by default.
 */
export async function apiHealth() {
  const base = getApiBase();
  const path = HEALTH_PATH.startsWith("/") ? HEALTH_PATH : `/${HEALTH_PATH}`;
  const url = `${trimTrailingSlash(base)}${path}`;
  try {
    const res = await fetch(url, { method: "GET" });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e?.message || "Network error" };
  }
}

export default { apiGet, apiPost, apiPut, getAuthHeader, getApiBase, apiHealth };
