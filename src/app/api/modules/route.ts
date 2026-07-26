import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";
import type { Module } from "@/lib/types/system";

/** Trả về danh sách modules mà user hiện tại được phép truy cập. */
export async function GET() {
  try {
    const user = await requireUser();

    const modsSnap = await adminDb
      .collection("modules")
      .where("active", "==", true)
      .orderBy("thuTu")
      .get();
    const allModules = modsSnap.docs.map((d) => d.data() as Module);

    if (isAdmin(user)) {
      return NextResponse.json({ modules: allModules });
    }

    if (!user.roleId) {
      return NextResponse.json({ modules: [] });
    }

    const permsSnap = await adminDb
      .collection("roles")
      .doc(user.roleId)
      .collection("permissions")
      .where("canView", "==", true)
      .get();
    const allowedCodes = new Set(permsSnap.docs.map((d) => d.id));
    // Dashboard và Settings luôn hiển thị (giữ đúng hành vi bản gốc).
    allowedCodes.add("dashboard");
    allowedCodes.add("settings");

    const filtered = allModules.filter((m) => allowedCodes.has(m.code));
    return NextResponse.json({ modules: filtered });
  } catch (e) {
    return handleApiError(e);
  }
}
