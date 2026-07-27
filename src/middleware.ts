import { NextRequest, NextResponse } from "next/server";
import { HPCORE_SESSION_COOKIE, HPCORE_LOGIN_URL } from "@/lib/constants";

// Middleware chạy trên Edge runtime nên KHÔNG dùng firebase-admin ở đây (cần Node
// crypto). Middleware chỉ kiểm tra sự hiện diện của cookie "session" (dùng chung
// domain .hpcore.vn) để redirect sớm sang account.hpcore.vn — khoerp không còn
// trang /login riêng. Xác thực thật + kiểm tra quyền app (401 vs 403) diễn ra
// trong app/(dashboard)/layout.tsx qua getAuthState() (Node.js runtime).
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(HPCORE_SESSION_COOKIE);
  if (!hasSession) {
    const loginUrl = new URL(HPCORE_LOGIN_URL);
    loginUrl.searchParams.set("next", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/roles|_next/static|_next/image|favicon.ico).*)"],
};
