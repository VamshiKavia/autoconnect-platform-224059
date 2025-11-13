/**
 * Simple API client using fetch and environment variables.
 * Respects REACT_APP_API_BASE or REACT_APP_BACKEND_URL.
 */
const base =
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_BACKEND_URL ||
  "http://localhost:3001";

/**
// PUBLIC_INTERFACE
 * apiGet - Perform GET request to backend.
 * @param {string} path - endpoint path starting with '/'
 * @param {object} opts - optional fetch options
 */
export async function apiGet(path, opts = {}) {
  const res = await fetch(base + path, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const t = await safeJson(res);
    throw new Error(t?.detail || `GET ${path} failed (${res.status})`);
  }
  return res.json();
}

/**
// PUBLIC_INTERFACE
 * apiPost - Perform POST request to backend.
 * @param {string} path - endpoint path starting with '/'
 * @param {object} body - JSON body
 * @param {object} opts - optional fetch options
 */
export async function apiPost(path, body, opts = {}) {
  const res = await fetch(base + path, {
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
    throw new Error(t?.detail || `POST ${path} failed (${res.status})`);
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
  const res = await fetch(base + path, {
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
    throw new Error(t?.detail || `PUT ${path} failed (${res.status})`);
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

export default { apiGet, apiPost, apiPut, getAuthHeader };
