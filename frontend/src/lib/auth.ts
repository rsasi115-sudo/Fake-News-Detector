/**
 * Auth service — talks to /api/auth/* endpoints.
 */

import { api, type ApiResponse } from "@/lib/api";

export interface AuthUser {
  id: number;
  mobile: string;
  is_active: boolean;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthData extends AuthTokens {
  user: AuthUser;
}

// ── token helpers ──────────────────────────────────────────────────

const ACCESS_KEY = "truthlens_access_token";
const REFRESH_KEY = "truthlens_refresh_token";

export function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function hasTokens(): boolean {
  return !!getAccessToken();
}

// ── API calls ──────────────────────────────────────────────────────

export async function signup(mobile: string, password: string): Promise<ApiResponse<AuthData>> {
  return api.post<AuthData>("/auth/signup/", { mobile, password });
}

export async function login(mobile: string, password: string): Promise<ApiResponse<AuthData>> {
  return api.post<AuthData>("/auth/login/", { mobile, password });
}

export async function refreshAccessToken(): Promise<ApiResponse<AuthTokens>> {
  const refresh = getRefreshToken();
  if (!refresh) return { success: false, error: { code: "NO_REFRESH", message: "No refresh token." } };
  return api.post<AuthTokens>("/auth/refresh/", { refresh });
}

export async function fetchMe(): Promise<ApiResponse<AuthUser>> {
  return api.get<AuthUser>("/auth/me/");
}
