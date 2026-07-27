import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { rollbackDocument, writeAudit } from "@/lib/server/warehouseEngine";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { PhieuKiemKe } from "@/lib/types/warehouse";

async function getPhieuOr404(id: string): Promise<PhieuKiemKe> {
  const snap = await adminDb.collection("warehouse_phieu_kiem_ke").doc(id).get();
  const data = snap.data() as PhieuKiemKe | undefined;
  if (!snap.exists || data?.deletedAt) throw new ApiError(404, "Không tìm thấy phiếu kiểm kê");
  return data!;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const phieu = await getPhieuOr404(id);
    const kho = await getKhoDisplay(phieu.khoId);
    return NextResponse.json({ ...phieu, kho });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền xóa phiếu kiểm kê");
    const { id } = await params;
    const phieu = await getPhieuOr404(id);

    try {
      await rollbackDocument({ refType: "kiem_ke", refId: id, userId: user.id });
    } catch (e) {
      throw new ApiError(500, `Lỗi rollback tồn kho khi xóa: ${e instanceof Error ? e.message : String(e)}`);
    }

    await adminDb.collection("warehouse_phieu_kiem_ke").doc(id).set(
      {
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
        deleteReason: "User deleted",
      },
      { merge: true }
    );

    await writeAudit({
      action: "DELETE",
      entityType: "phieu_kiem_ke",
      entityId: id,
      entityNumber: phieu.soChungTu,
      userId: user.id,
      userEmail: user.email,
      oldValues: phieu,
    });

    return NextResponse.json({ message: "Đã xóa phiếu kiểm kê, tồn kho đã được hoàn nguyên" });
  } catch (e) {
    return handleApiError(e);
  }
}
