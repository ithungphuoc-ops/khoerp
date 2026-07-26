import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin } from "@/lib/server/permissions";
import { logActivity } from "@/lib/server/activityLog";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { AppUser, Role } from "@/lib/types/system";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireUser();
    if (!isAdmin(currentUser)) throw new ApiError(403, "Chỉ ADMIN mới được đổi vai trò");
    const { id } = await params;
    const { role_id: roleId } = await req.json();
    if (!roleId) throw new ApiError(400, "Thiếu role_id");

    const userRef = adminDb.collection("users").doc(id);
    const [userSnap, newRoleSnap] = await Promise.all([
      userRef.get(),
      adminDb.collection("roles").doc(roleId).get(),
    ]);

    let oldRoleName = "";
    const oldRoleId = (userSnap.data() as AppUser | undefined)?.roleId;
    if (oldRoleId) {
      const oldRoleSnap = await adminDb.collection("roles").doc(oldRoleId).get();
      oldRoleName = (oldRoleSnap.data() as Role | undefined)?.tenRole || "";
    }
    const newRoleName = (newRoleSnap.data() as Role | undefined)?.tenRole || "";

    await userRef.set({ roleId, updatedAt: new Date().toISOString() }, { merge: true });

    await logActivity({
      actorId: currentUser.id,
      moduleCode: "iam_accounts",
      action: "CHANGE_ROLE",
      entity: "users",
      entityId: id,
      moTa: `Đổi vai trò: ${oldRoleName} → ${newRoleName}`,
    });

    return NextResponse.json({ message: "Đã cập nhật vai trò" });
  } catch (e) {
    return handleApiError(e);
  }
}
