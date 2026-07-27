"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, LogOut, User, Settings, Zap } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import type { CurrentUser } from "@/lib/server/auth";

function UserMenu({ user, onLogout }: { user: CurrentUser | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = (user?.hoTen || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 px-2 h-9 rounded-hp-md hover:bg-hp-surface transition-colors">
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="" />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: user?.roleColor || "#6366f1" }}
          >
            {initials}
          </div>
        )}
        <div className="hidden sm:block text-left min-w-0">
          <p className="text-sm font-medium text-hp-text leading-none truncate max-w-[120px]">
            {user?.hoTen || user?.email?.split("@")[0]}
          </p>
          <p className="text-[11px] text-hp-text-muted mt-0.5 truncate max-w-[120px]">{user?.role}</p>
        </div>
        <ChevronDown size={13} className="text-hp-text-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-52 bg-hp-card border border-hp-border rounded-hp-lg shadow-hp-lg z-50 py-1 animate-fadeIn">
          <div className="px-3 py-2 border-b border-hp-border-subtle">
            <p className="text-sm font-medium text-hp-text truncate">{user?.hoTen || user?.email?.split("@")[0]}</p>
            <p className="text-xs text-hp-text-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              router.push("/profile");
              setOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-3 h-9 text-sm text-hp-text-secondary hover:text-hp-text hover:bg-hp-surface transition-colors"
          >
            <User size={14} /> Hồ sơ cá nhân
          </button>
          <button
            onClick={() => {
              router.push("/settings");
              setOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-3 h-9 text-sm text-hp-text-secondary hover:text-hp-text hover:bg-hp-surface transition-colors"
          >
            <Settings size={14} /> Cài đặt
          </button>
          <div className="border-t border-hp-border-subtle my-1" />
          <button
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
            className="flex items-center gap-2.5 w-full px-3 h-9 text-sm text-hp-danger hover:bg-hp-danger/10 transition-colors"
          >
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationBell({ count = 0 }: { count?: number }) {
  return (
    <button className="relative flex items-center justify-center w-9 h-9 rounded-hp-md hover:bg-hp-surface transition-colors">
      <Bell size={18} className="text-hp-text-muted" />
      {count > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-hp-danger" />}
    </button>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // logout() tự điều hướng sang account.hpcore.vn sau khi xóa cookie cục bộ —
  // không còn trang /login riêng của khoerp để quay về nữa.
  async function handleLogout() {
    await logout();
  }

  return (
    <header
      className="flex items-center gap-3 px-4 shrink-0 border-b border-hp-border z-40"
      style={{ height: "var(--hp-header-h)", background: "var(--hp-header)" }}
    >
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hp-text-disabled" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="w-full h-8 pl-8 pr-3 rounded-hp-md bg-hp-surface border border-hp-border text-sm text-hp-text placeholder:text-hp-text-disabled focus:outline-none focus:border-hp-accent/50 focus:ring-1 focus:ring-hp-accent/20 transition-colors"
          />
        </div>
      </div>

      <div className={clsx("flex items-center gap-1")}>
        <NotificationBell count={0} />
        <button
          onClick={() => router.push("/ai")}
          className="flex items-center gap-1.5 px-3 h-9 rounded-hp-md text-sm text-hp-accent border border-hp-accent/30 hover:bg-hp-accent/10 transition-colors"
        >
          <Zap size={14} />
          <span className="hidden sm:block font-medium">AI</span>
        </button>
        <div className="w-px h-6 bg-hp-border mx-1" />
        <UserMenu user={user} onLogout={handleLogout} />
      </div>
    </header>
  );
}
