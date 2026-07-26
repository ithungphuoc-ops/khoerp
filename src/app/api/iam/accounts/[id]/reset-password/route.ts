import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin } from "@/lib/server/permissions";
import { logActivity } from "@/lib/server/activityLog";
import { handleApiError, ApiError } from "@/lib/server/apiError";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireUser();
    if (!isAdmin(currentUser)) throw new ApiError(403, "Chỉ ADMIN mới được reset mật khẩu");
    const { id } = await params;
    const { new_password: newPassword } = await req.json();
    if (!newPassword) throw new ApiError(400, "Thiếu mật khẩu mới");

    try {
      await adminAuth.updateUser(id, { password: newPassword });
    } catch (e) {
      throw new ApiError(500, `Lỗi reset mật khẩu: ${e instanceof Error ? e.message : String(e)}`);
    }

    await logActivity({
      actorId: currentUser.id,
      moduleCode: "iam_accounts",
      action: "RESET_PASSWORD",
      entity: "users",
      entityId: id,
      moTa: "Reset mật khẩu",
    });

    return NextResponse.json({ message: "Đã reset mật khẩu" });
  } catch (e) {
    return handleApiError(e);
  }
}
