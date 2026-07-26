import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware chỉ kiểm tra cookie có tồn tại hay không (Edge runtime, không
  // verify được chữ ký). Xác thực thật diễn ra ở đây bằng Admin SDK — nếu
  // cookie giả/hết hạn/tài khoản bị revoke thì redirect về /login.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
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
