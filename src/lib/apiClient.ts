"use client";

import { HPCORE_LOGIN_URL } from "@/lib/constants";

/**
 * Client fetch wrapper cho các route /api/** của chính app này. Khác bản gốc
 * (frontend/src/api/index.js): không cần Authorization header/localStorage
 * token — phiên đăng nhập là httpOnly cookie "session" dùng chung domain
 * .hpcore.vn, trình duyệt tự gửi kèm mỗi request cùng-origin.
 */
export class ApiRequestError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && typeof window !== "undefined" && !path.includes("/auth/")) {
    window.location.href = HPCORE_LOGIN_URL;
    throw new ApiRequestError(401, "Chưa đăng nhập", data);
  }
  if (!res.ok) {
    throw new ApiRequestError(res.status, (data as { detail?: string })?.detail || `Lỗi ${res.status}`, data);
  }
  return data as T;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => request<T>(path, { method: "DELETE" }),
};
