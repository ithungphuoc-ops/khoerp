import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const user = await requireUser();
    requireManager(user);
    const { id, userId } = await params;

    await adminDb
      .collection("groups")
      .doc(id)
      .update({ memberIds: FieldValue.arrayRemove(userId) });

    return NextResponse.json({ message: "Đã xóa thành viên khỏi nhóm" });
  } catch (e) {
    return handleApiError(e);
  }
}
