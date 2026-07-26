import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";
import type { ActivityLog } from "@/lib/types/system";

export async function GET() {
  try {
    const user = await requireUser();
    requireManager(user);

    const snap = await adminDb.collection("activity_log").orderBy("createdAt", "desc").limit(1000).get();
    const actions = [...new Set(snap.docs.map((d) => (d.data() as ActivityLog).action).filter(Boolean))].sort();
    return NextResponse.json({ actions });
  } catch (e) {
    return handleApiError(e);
  }
}
