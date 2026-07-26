import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_EXPIRES_IN_MS } from "@/lib/server/session";
import { getOrCreateAppUser, touchLastLogin } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json().catch(() => ({ idToken: null }));
  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json({ detail: "Thiếu idToken" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ detail: "Token không hợp lệ hoặc đã hết hạn" }, { status: 401 });
  }

  const user = await getOrCreateAppUser(decoded.uid, decoded.email ?? "");
  await touchLastLogin(decoded.uid);

  const sessionCookie = await createSessionCookie(idToken);

  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRES_IN_MS / 1000,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ message: "Đăng xuất thành công" });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
