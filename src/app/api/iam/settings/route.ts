import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireAdmin } from "@/lib/server/permissions";
import { logActivity } from "@/lib/server/activityLog";
import { handleApiError } from "@/lib/server/apiError";

export async function GET() {
  try {
    const user = await requireUser();
    requireAdmin(user, "Chỉ ADMIN mới được xem cài đặt");

    const snap = await adminDb.collection("settings").orderBy("nhom").get();
    const settings = snap.docs.map((d) => ({ key: d.id, ...d.data() }));
    return NextResponse.json({ settings });
  } catch (e) {
    return handleApiError(e);
  }
}

interface SettingUpdate {
  key: string;
  value: string;
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    requireAdmin(user, "Chỉ ADMIN mới được thay đổi cài đặt");
    const updates = (await req.json()) as SettingUpdate[];

    const now = new Date().toISOString();
    const batch = adminDb.batch();
    for (const item of updates) {
      batch.set(
        adminDb.collection("settings").doc(item.key),
        { value: item.value, updatedBy: user.id, updatedAt: now },
        { merge: true }
      );
    }
    await batch.commit();

    await logActivity({
      actorId: user.id,
      moduleCode: "iam_settings",
      action: "UPDATE_SETTINGS",
      moTa: `Cập nhật ${updates.length} cài đặt bảo mật`,
    });

    return NextResponse.json({ message: "Đã lưu cài đặt" });
  } catch (e) {
    return handleApiError(e);
  }
}
