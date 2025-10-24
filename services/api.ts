// src/services/api.ts
/**
 * Centralized API client + token helpers for the application.
 * - Uses fetch under the hood
 * - Reads NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_HARDCODED_TOKEN from env (for Next.js)
 * - Exposes `apiCall` and a small `api` wrapper with get/post/put/patch/delete
 */

export const API_BASE_URL = "http://localhost:8080";

// Optional: fallback token for local testing. Keep empty in production.
// Set NEXT_PUBLIC_HARDCODED_TOKEN in .env.local only if you truly need it.
export const HARDCODED_TOKEN = "";

/* ---------------------------
   Token / Storage helpers
   --------------------------- */

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("auth_token", token);
  } catch {
    // ignore storage errors
  }
};

export const clearToken = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("auth_token");
  } catch {
    // ignore
  }
};

/* ---------------------------
   Generic API call helper
   --------------------------- */

/**
 * Generic API caller using fetch
 * @param method HTTP method
 * @param endpoint path starting with / (will be appended to API_BASE_URL)
 * @param body optional request body (will be JSON.stringified)
 * @param additionalHeaders optional headers to merge with defaults
 * @returns parsed JSON as type T
 */
export async function apiCall<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  additionalHeaders?: HeadersInit
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(additionalHeaders ?? {}),
  };

  // prefer stored token; fallback to HARDCODED_TOKEN for local testing if set
  const token = getToken() || (HARDCODED_TOKEN ? HARDCODED_TOKEN : null);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && body !== null) {
    options.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const res = await fetch(url, options);

  // If not OK, try to parse error body for message, then throw
  if (!res.ok) {
    // handle unauthorized specifically
    if (res.status === 401) {
      // clear token so next request is forced to re-auth
      clearToken();
      // Note: UI-level redirect to /login should be done by caller
    }

    // attempt to parse json error message
    const parsed = await res.json().catch(() => null);
    const msg = parsed?.message || parsed?.error || `API Error: ${res.status} ${res.statusText}`;
    // dev logging
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(`[apiCall] ${method} ${url} -> ${res.status}`, parsed ?? res.statusText);
    }
    throw new Error(msg);
  }

  // Handle No Content or explicit empty responses
  const contentLength = res.headers.get("content-length");
  if (res.status === 204 || contentLength === "0") {
    return {} as T;
  }

  // Some servers may return empty body with 200; guard against that
  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    // If parsing fails, return raw text as unknown (cast to T)
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[apiCall] JSON parse failed for ${method} ${url}`, text);
    }
    return (text as unknown) as T;
  }
}

/* ---------------------------
   Small `api` wrapper
   --------------------------- */

/**
 * Lightweight client wrapper that exposes typed get/post/put/patch/delete methods
 * Services in the codebase can import { api } and call api.get<T>(...).
 */
export const api = {
  async get<T = any>(endpoint: string, additionalHeaders?: HeadersInit): Promise<T> {
    return apiCall<T>("GET", endpoint, undefined, additionalHeaders);
  },

  async post<T = any>(endpoint: string, body?: unknown, additionalHeaders?: HeadersInit): Promise<T> {
    return apiCall<T>("POST", endpoint, body, additionalHeaders);
  },

  async put<T = any>(endpoint: string, body?: unknown, additionalHeaders?: HeadersInit): Promise<T> {
    return apiCall<T>("PUT", endpoint, body, additionalHeaders);
  },

  async patch<T = any>(endpoint: string, body?: unknown, additionalHeaders?: HeadersInit): Promise<T> {
    return apiCall<T>("PATCH", endpoint, body, additionalHeaders);
  },

  /**
   * DELETE wrapper. Some APIs accept a body with DELETE (supported here).
   */
  async delete<T = any>(endpoint: string, body?: unknown, additionalHeaders?: HeadersInit): Promise<T> {
    return apiCall<T>("DELETE", endpoint, body, additionalHeaders);
  },
};

/* ---------------------------
   Exports summary
   --------------------------- */
// named exports already provided above; you can import any of these from this module:
// import { API_BASE_URL, apiCall, api, getToken, setToken, clearToken } from 'src/services/api'
