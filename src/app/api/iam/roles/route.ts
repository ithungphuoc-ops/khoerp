import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireAdmin, requireManager } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";

export async function GET() {
  try {
    const user = await requireUser();
    requireManager(user);

    const snap = await adminDb.collection("roles").orderBy("createdAt").get();
    const roles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ roles });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireAdmin(user, "Chỉ ADMIN mới được quản lý vai trò");

    const body = await req.json();
    const data = {
      tenRole: body.ten_role,
      moTa: body.mo_ta ?? null,
      color: body.color || "#818cf8",
      active: true,
      createdAt: new Date().toISOString(),
    };
    const ref = await adminDb.collection("roles").add(data);
    return NextResponse.json({ message: "Đã tạo vai trò", role: { id: ref.id, ...data } });
  } catch (e) {
    return handleApiError(e);
  }
}
