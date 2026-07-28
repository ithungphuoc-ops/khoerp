import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/apiError";
import type { PhieuXuatKho } from "@/lib/types/warehouse";

/**
 * Báo cáo Xuất kho theo Phòng ban/Công trình — trả về nguyên phiếu xuất
 * (kèm chi tiết) trong phạm vi lọc, để FE tự nhóm theo phongBan/congTrinh và
 * tổng hợp (số phiếu, tổng tiền, mặt hàng đã xuất) — quy mô phiếu xuất một
 * công ty đủ nhỏ để nhóm ở client, không cần tính sẵn ở server.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const khoId = sp.get("kho_id") || null;
    const tuNgay = sp.get("tu_ngay") || null;
    const denNgay = sp.get("den_ngay") || null;

    const snap = await adminDb.collection("warehouse_phieu_xuat").orderBy("ngayHachToan", "desc").get();
    let rows = snap.docs.map((d) => d.data() as PhieuXuatKho).filter((p) => !p.deletedAt);

    if (khoId) rows = rows.filter((p) => p.khoId === khoId);
    if (tuNgay) rows = rows.filter((p) => p.ngayHachToan >= tuNgay);
    if (denNgay) rows = rows.filter((p) => p.ngayHachToan <= denNgay);

    return NextResponse.json({ items: rows });
  } catch (e) {
    return handleApiError(e);
  }
}
