import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/apiError";

export async function GET() {
  try {
    const user = await requireUser();

    const snap = await adminDb
      .collection("users")
      .doc(user.id)
      .collection("notifications")
      .where("daDoc", "==", false)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ notifications, unread_count: notifications.length });
  } catch (e) {
    return handleApiError(e);
  }
}
