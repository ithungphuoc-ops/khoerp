import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";
import type { Group } from "@/lib/types/system";

export async function GET() {
  try {
    const user = await requireUser();
    requireManager(user);

    const snap = await adminDb.collection("groups").where("active", "==", true).orderBy("tenNhom").get();
    const groups = snap.docs.map((d) => {
      const g = d.data() as Group;
      return { id: d.id, ...g, member_count: g.memberIds?.length || 0 };
    });
    return NextResponse.json({ groups });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireManager(user);
    const body = await req.json();

    const now = new Date().toISOString();
    const data = {
      tenNhom: body.ten_nhom,
      moTa: body.mo_ta ?? null,
      color: body.color || "#6b7280",
      active: true,
      memberIds: [] as string[],
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await adminDb.collection("groups").add(data);
    return NextResponse.json({ message: "Đã tạo nhóm", group: { id: ref.id, ...data } });
  } catch (e) {
    return handleApiError(e);
  }
}
