import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { LogoutButton } from "./LogoutButton";

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
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <span className="font-semibold text-gray-900">HPCons ERP</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {user.hoTen} · <span style={{ color: user.roleColor }}>{user.role}</span>
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
