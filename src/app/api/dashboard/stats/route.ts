import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/apiError";
import type { Module } from "@/lib/types/system";

export async function GET() {
  try {
    await requireUser();

    const [usersSnap, modsSnap] = await Promise.all([
      adminDb.collection("users").where("active", "==", true).count().get(),
      adminDb.collection("modules").where("active", "==", true).get(),
    ]);

    const totalModules = modsSnap.docs.filter((d) => !(d.data() as Module).parentCode).length;

    return NextResponse.json({
      total_users: usersSnap.data().count,
      total_modules: totalModules,
      system_status: "online",
      last_updated: new Date().toISOString(),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
