import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user);
    const { id } = await params;
    const { user_ids: userIds } = (await req.json()) as { user_ids: string[] };

    if (userIds?.length) {
      await adminDb
        .collection("groups")
        .doc(id)
        .update({ memberIds: FieldValue.arrayUnion(...userIds) });
    }

    return NextResponse.json({ message: `Đã thêm ${userIds?.length || 0} thành viên` });
  } catch (e) {
    return handleApiError(e);
  }
}
