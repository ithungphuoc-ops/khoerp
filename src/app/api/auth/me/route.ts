import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ detail: "Chưa đăng nhập" }, { status: 401 });
  }
  return NextResponse.json(user);
}
