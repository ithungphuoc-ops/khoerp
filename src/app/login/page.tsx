"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const FEATURES = ["Kho Tổng & Kho Công trình", "Quản lý nhân sự & công việc", "Mua hàng & tài sản", "AI Center tích hợp"];

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace(searchParams.get("next") || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--hp-bg)" }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-96 p-10 border-r border-hp-border" style={{ background: "var(--hp-sidebar)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-hp-md bg-hp-primary/15 border border-hp-primary/30">
            <Zap size={18} className="text-hp-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-hp-text">HPCons ERP</p>
            <p className="text-[11px] text-hp-text-disabled">Platform v2.0</p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-hp-text mb-3 leading-snug">
            Hệ thống quản lý
            <br />
            toàn diện doanh nghiệp
          </h2>
          <p className="text-sm text-hp-text-muted leading-relaxed">
            Quản lý kho, nhân sự, mua hàng, tài sản và nhiều hơn nữa — tất cả trong một nền tảng duy nhất.
          </p>

          <div className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-hp-text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-hp-primary shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-hp-text-disabled">HP Cons Việt Nam © {new Date().getFullYear()}</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-9 h-9 rounded-hp-md bg-hp-primary/15 border border-hp-primary/30">
              <Zap size={18} className="text-hp-primary" />
            </div>
            <p className="text-lg font-semibold text-hp-text">HPCons ERP</p>
          </div>

          <h1 className="text-xl font-semibold text-hp-text mb-1">Đăng nhập</h1>
          <p className="text-sm text-hp-text-muted mb-7">Chào mừng trở lại</p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-hp-md bg-hp-danger/10 border border-hp-danger/30 text-hp-danger text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-hp-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@hpcons.com.vn"
                autoComplete="email"
                className="hp-input"
              />
            </div>

            <div>
              <label className="block text-sm text-hp-text-secondary mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="hp-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-hp-text-muted hover:text-hp-text transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="hp-btn-primary w-full h-10 justify-center mt-2">
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
