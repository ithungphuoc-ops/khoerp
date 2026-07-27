"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { HPCORE_LOGIN_URL } from "@/lib/constants";
import type { CurrentUser } from "@/lib/server/auth";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  /** true nếu đã đăng nhập hpcore nhưng CHƯA được cấp quyền app này (403). */
  denied: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (res.ok) {
      setUser(await res.json());
      setDenied(false);
    } else {
      setUser(null);
      setDenied(res.status === 403);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Đăng nhập KHÔNG còn xảy ra trong khoerp — toàn bộ diễn ra ở account.hpcore.vn.
  // Cookie "session" dùng chung domain .hpcore.vn nên tự động có sẵn sau khi
  // đăng nhập ở đó; middleware.ts tự redirect người chưa đăng nhập sang đó.
  const logout = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    window.location.href = HPCORE_LOGIN_URL;
  }, []);

  return <AuthContext.Provider value={{ user, loading, denied, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được gọi bên trong <AuthProvider>");
  return ctx;
}
