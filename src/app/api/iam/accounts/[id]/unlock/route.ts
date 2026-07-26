import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin } from "@/lib/server/permissions";
import { logActivity } from "@/lib/server/activityLog";
import { handleApiError, ApiError } from "@/lib/server/apiError";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireUser();
    if (!isAdmin(currentUser)) throw new ApiError(403, "Chỉ ADMIN mới được mở khóa");
    const { id } = await params;

    await adminDb.collection("users").doc(id).set(
      {
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
        loginAttempts: 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await logActivity({
      actorId: currentUser.id,
      moduleCode: "iam_accounts",
      action: "UNLOCK_USER",
      entity: "users",
      entityId: id,
      moTa: "Mở khóa tài khoản",
    });

    return NextResponse.json({ message: "Đã mở khóa tài khoản" });
  } catch (e) {
    return handleApiError(e);
  }
}
