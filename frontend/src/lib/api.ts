/**
 * Thin HTTP client that prefixes every request with VITE_API_BASE_URL
 * and attaches the JWT access token when available.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("truthlens_access_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Try to parse JSON regardless of status
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // Backend returns { success, error } on failure
    if (body?.error) {
      return { success: false, error: body.error };
    }
    // Fallback for DRF default error shapes (e.g. 401 detail)
    return {
      success: false,
      error: {
        code: `HTTP_${res.status}`,
        message: body?.detail ?? res.statusText,
      },
    };
  }

  // Success – backend wraps in { success, data }
  if (body?.success !== undefined) {
    return body as ApiResponse<T>;
  }
  // Fallback (e.g. SimpleJWT refresh returns flat object)
  return { success: true, data: body as T };
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: "GET" }),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};
