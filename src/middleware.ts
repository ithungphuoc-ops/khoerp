import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

// Middleware chạy trên Edge runtime nên KHÔNG dùng firebase-admin ở đây (cần Node
// crypto). Middleware chỉ kiểm tra sự hiện diện của cookie để redirect sớm, giảm
// tải cho trang login. Xác thực thật (verifySessionCookie qua Admin SDK) diễn ra
// trong app/(dashboard)/layout.tsx — nơi Node.js runtime luôn khả dụng.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSession) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};
