"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Đăng xuất
    </button>
  );
}
