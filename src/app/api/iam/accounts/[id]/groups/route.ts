import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { logActivity } from "@/lib/server/activityLog";
import { handleApiError } from "@/lib/server/apiError";

/** Gán user vào đúng danh sách nhóm group_ids — xóa khỏi các nhóm không còn trong danh sách. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireUser();
    requireManager(currentUser);
    const { id } = await params;
    const { group_ids: groupIds } = (await req.json()) as { group_ids: string[] };

    const currentSnap = await adminDb.collection("groups").where("memberIds", "array-contains", id).get();
    const currentGroupIds = new Set(currentSnap.docs.map((d) => d.id));
    const targetGroupIds = new Set(groupIds || []);

    const batch = adminDb.batch();
    for (const gid of currentGroupIds) {
      if (!targetGroupIds.has(gid)) {
        batch.update(adminDb.collection("groups").doc(gid), { memberIds: FieldValue.arrayRemove(id) });
      }
    }
    for (const gid of targetGroupIds) {
      if (!currentGroupIds.has(gid)) {
        batch.update(adminDb.collection("groups").doc(gid), { memberIds: FieldValue.arrayUnion(id) });
      }
    }
    await batch.commit();

    await logActivity({
      actorId: currentUser.id,
      moduleCode: "iam_accounts",
      action: "ASSIGN_GROUPS",
      entity: "users",
      entityId: id,
      moTa: `Cập nhật nhóm: ${(groupIds || []).join(", ")}`,
    });

    return NextResponse.json({ message: "Đã cập nhật nhóm" });
  } catch (e) {
    return handleApiError(e);
  }
}
