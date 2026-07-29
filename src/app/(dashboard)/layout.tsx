import { redirect } from "next/navigation";
import { ShieldAlert, Hammer } from "lucide-react";
import { getAuthState } from "@/lib/server/auth";
import { HPCORE_LOGIN_URL } from "@/lib/constants";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware chỉ kiểm tra cookie "session" có tồn tại hay không (Edge runtime,
  // không verify được chữ ký). Xác thực thật + kiểm tra quyền app diễn ra ở đây
  // bằng Admin SDK của hpcons-portal.
  const state = await getAuthState();

  if (state.kind === "unauthenticated") {
    const loginUrl = new URL(HPCORE_LOGIN_URL);
    loginUrl.searchParams.set("next", `https://khoerp.hpcore.vn`);
    redirect(loginUrl.toString());
  }

  if (state.kind === "developing") {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--hp-bg)" }}>
        <div className="hp-card max-w-sm p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-hp-xl bg-hp-primary/15 border border-hp-primary/30">
            <Hammer size={26} className="text-hp-primary" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-hp-text">Đang phát triển</h1>
          <p className="text-sm text-hp-text-muted">Kho Tổng HPCons (khoerp) đang trong quá trình xây dựng. Vui lòng quay lại sau.</p>
        </div>
      </div>
    );
  }

  if (state.kind === "forbidden") {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--hp-bg)" }}>
        <div className="hp-card max-w-sm p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-hp-xl bg-hp-danger/15 border border-hp-danger/30">
            <ShieldAlert size={26} className="text-hp-danger" />
          </div>
          <h1 className="mb-2 text-lg font-semibold text-hp-text">Chưa được cấp quyền</h1>
          <p className="text-sm text-hp-text-muted">
            Tài khoản của bạn đã đăng nhập HPCore nhưng chưa được cấp quyền truy cập khoerp. Liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--hp-bg)" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
