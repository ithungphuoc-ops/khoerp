import { NextResponse } from "next/server";
import { HPCORE_SESSION_COOKIE } from "@/lib/constants";

/**
 * khoerp không tự tạo session nữa — đăng nhập xảy ra hoàn toàn ở
 * account.hpcore.vn (POST /api/auth/session bên đó tạo cookie "session" dùng
 * chung domain .hpcore.vn). Route này chỉ còn DELETE để đăng xuất: vì cookie
 * dùng chung domain cha, khoerp tự xóa được ở phía mình mà không cần gọi API
 * hpcore (giống hệt cách KhoUNICE_Web_NEW đã làm).
 */
export async function DELETE() {
  const res = NextResponse.json({ message: "Đăng xuất thành công" });
  res.cookies.set(HPCORE_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: process.env.NODE_ENV === "production" ? ".hpcore.vn" : undefined,
    maxAge: 0,
  });
  return res;
}
