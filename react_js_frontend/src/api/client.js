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

import { isMockBackendEnabled } from "../config";

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
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
        ...getAuthHeader(), // attach token if present
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
  } catch (err) {
    if (isMockBackendEnabled()) {
      const mock = mockGet(path);
      if (mock.ok) return mock.data;
    }
    throw err;
  }
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
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
        ...getAuthHeader(),
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
  } catch (err) {
    if (isMockBackendEnabled()) {
      const mock = mockPost(path, body);
      if (mock.ok) return mock.data;
    }
    throw err;
  }
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
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
        ...getAuthHeader(),
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
  } catch (err) {
    if (isMockBackendEnabled()) {
      const mock = mockPut(path, body);
      if (mock.ok) return mock.data;
    }
    throw err;
  }
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

// ---- Mock fallback data (feature-flagged) ----
function mockGet(path) {
  const now = new Date().toISOString();
  switch (normalize(path)) {
    case "/cars":
      return {
        ok: true,
        data: [
          { id: 1, name: "Aerexa", type: "Sedan", year: 2025, price: 28990, is_new: true },
          { id: 2, name: "Straton Sport", type: "Coupe", year: 2025, price: 41990, is_new: true },
          { id: 3, name: "Azure GT", type: "Coupe", year: 2024, price: 48990, is_new: false },
        ],
      };
    case "/services":
      return {
        ok: true,
        data: [
          { id: "svc1", name: "Oil Change", price: 69, duration_min: 30 },
          { id: "svc2", name: "Brake Inspection", price: 99, duration_min: 45 },
          { id: "svc3", name: "AC Service", price: 129, duration_min: 60 },
        ],
      };
    case "/parts":
      return {
        ok: true,
        data: [
          { id: "p1", name: "Air Filter", sku: "AF-001", price: 19.99 },
          { id: "p2", name: "Brake Pads", sku: "BP-101", price: 49.99 },
          { id: "p3", name: "Spark Plug", sku: "SP-301", price: 9.99 },
        ],
      };

    case "/profile":
      return {
        ok: true,
        data: {
          email: "demo@example.com",
          name: "Demo User",
          phone: "",
          bio: "",
          created_at: now,
        },
      };
    default:
      return { ok: false, data: null };
  }
}

function mockPost(path, body) {
  const p = normalize(path);
  if (p === "/auth/login") {
    if (body?.email && body?.password) {
      return {
        ok: true,
        data: {
          access_token: "mock-token",
          token_type: "bearer",
          user: { email: body.email, name: "Demo User" },
        },
      };
    }
    return { ok: false, data: null };
  }
  if (p === "/auth/register") {
    if (body?.email && body?.password && body?.name) {
      return {
        ok: true,
        data: {
          access_token: "mock-token",
          token_type: "bearer",
          user: { email: body.email, name: body.name },
        },
      };
    }
    return { ok: false, data: null };
  }
  return { ok: false, data: null };
}

function mockPut(path, body) {
  const p = normalize(path);
  if (p === "/profile") {
    return { ok: true, data: body };
  }
  return { ok: false, data: null };
}

function normalize(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

export default { apiGet, apiPost, apiPut, getAuthHeader, getApiBase, apiHealth };
