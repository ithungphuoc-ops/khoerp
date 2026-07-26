import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin } from "@/lib/server/permissions";
import { logActivity } from "@/lib/server/activityLog";
import { handleApiError, ApiError } from "@/lib/server/apiError";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireUser();
    if (!isAdmin(currentUser)) throw new ApiError(403, "Chỉ ADMIN mới được khóa tài khoản");
    const { id } = await params;
    if (id === currentUser.id) throw new ApiError(400, "Không thể khóa chính mình");

    const body = await req.json().catch(() => ({}));
    const reason: string | undefined = body?.reason;
    const now = new Date().toISOString();

    await adminDb.collection("users").doc(id).set(
      {
        isLocked: true,
        lockedAt: now,
        lockedReason: reason || "Admin khóa thủ công",
        updatedAt: now,
      },
      { merge: true }
    );

    await logActivity({
      actorId: currentUser.id,
      moduleCode: "iam_accounts",
      action: "LOCK_USER",
      entity: "users",
      entityId: id,
      moTa: `Khóa tài khoản. Lý do: ${reason || "Không có"}`,
    });

    return NextResponse.json({ message: "Đã khóa tài khoản" });
  } catch (e) {
    return handleApiError(e);
  }
}
