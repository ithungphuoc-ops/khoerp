import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireAdmin } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { Role, Permission } from "@/lib/types/system";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireAdmin(user, "Chỉ ADMIN mới được quản lý vai trò");
    const { id } = await params;

    const srcSnap = await adminDb.collection("roles").doc(id).get();
    if (!srcSnap.exists) throw new ApiError(404, "Không tìm thấy vai trò");
    const src = srcSnap.data() as Role;

    const newRoleData = {
      tenRole: `${src.tenRole} (Copy)`,
      moTa: src.moTa ?? null,
      color: src.color || "#818cf8",
      active: true,
      createdAt: new Date().toISOString(),
    };
    const newRoleRef = await adminDb.collection("roles").add(newRoleData);

    const permsSnap = await adminDb.collection("roles").doc(id).collection("permissions").get();
    if (!permsSnap.empty) {
      const batch = adminDb.batch();
      permsSnap.docs.forEach((d) => {
        const p = d.data() as Permission;
        batch.set(newRoleRef.collection("permissions").doc(d.id), p);
      });
      await batch.commit();
    }

    return NextResponse.json({ message: "Đã clone vai trò", new_role_id: newRoleRef.id });
  } catch (e) {
    return handleApiError(e);
  }
}
