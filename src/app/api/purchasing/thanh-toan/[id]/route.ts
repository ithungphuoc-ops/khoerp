import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const snap = await adminDb.collection("purchasing_thanh_toan").doc(id).get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy phiếu thanh toán");
    return NextResponse.json(snap.data());
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền xóa phiếu thanh toán");
    const { id } = await params;
    const ref = adminDb.collection("purchasing_thanh_toan").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy phiếu thanh toán");

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
