export const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// --- Token Helpers ---
export const getToken = (): string | null => typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
export const setToken = (token: string): void => { if (typeof window !== "undefined") localStorage.setItem("auth_token", token); };
export const getRefreshToken = (): string | null => typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
export const setRefreshToken = (token: string): void => { if (typeof window !== "undefined") localStorage.setItem("refresh_token", token); };
export const clearToken = (): void => { if (typeof window !== "undefined") { localStorage.removeItem("auth_token"); localStorage.removeItem("refresh_token"); } };

// helper to detect auth/public endpoints where access token should NOT be sent
const isAuthEndpoint = (endpoint: string) => {
  // normalize (endpoint might include querystring) and check the path start
  const path = endpoint.split('?')[0].toLowerCase();
  return path === '/auth/login' || path === '/auth/refresh-token' || path.startsWith('/auth/');
};

// --- Refresh Token Handler ---
async function refreshToken(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${refreshToken}` },
    // If your backend expects the refresh token in the body instead, change to:
    // body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    clearToken();
    throw new Error("Failed to refresh token");
  }

  const data = await response.json() as { token: string; refreshToken: string; expiresIn: number };
  setToken(data.token);
  setRefreshToken(data.refreshToken);
}

// --- Generic API Call ---
// note: this function will not attach the access token for auth endpoints (login/refresh)
export async function apiCall<T>(method: string, endpoint: string, body?: unknown, retry = true): Promise<T> {
  const headers: HeadersInit = { "Content-Type": "application/json" };

  // Only attach the access token for non-auth endpoints
  try {
    if (!isAuthEndpoint(endpoint)) {
      const token = getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (err) {
    // Defensive: localStorage might throw in some environments; ignore and proceed
    console.debug("apiCall: token read error", err);
  }

  const options: RequestInit = { method, headers };
  if (body !== undefined && body !== null) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    if (response.status === 401 && retry) {
      // attempt refresh only when the call was protected (non-auth) — but safe to try anyway
      try {
        await refreshToken();
        return apiCall<T>(method, endpoint, body, false);
      } catch (refreshErr) {
        clearToken();
        throw new Error("Unauthorized. Please login again.");
      }
    }

    const parsed = await response.json().catch(() => null);
    const msg = parsed?.message || parsed?.error || `API Error: ${response.status} ${response.statusText}`;
    throw new Error(msg);
  }

  // no content
  if (response.status === 204 || response.headers.get("content-length") === "0") return {} as T;
  const text = await response.text();
  if (!text) return {} as T;
  try { return JSON.parse(text) as T; } 
  catch { return (text as unknown) as T; }
}

// --- Small api wrapper ---
export const api = {
  get: <T = any>(endpoint: string) => apiCall<T>("GET", endpoint),
  post: <T = any>(endpoint: string, body?: unknown) => apiCall<T>("POST", endpoint, body),
  put: <T = any>(endpoint: string, body?: unknown) => apiCall<T>("PUT", endpoint, body),
  patch: <T = any>(endpoint: string, body?: unknown) => apiCall<T>("PATCH", endpoint, body),
  delete: <T = any>(endpoint: string, body?: unknown) => apiCall<T>("DELETE", endpoint, body),
};
