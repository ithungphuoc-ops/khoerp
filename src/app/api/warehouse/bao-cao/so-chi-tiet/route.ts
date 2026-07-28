import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { WarehouseLedgerEntry } from "@/lib/types/warehouse";

/** Sổ chi tiết 1 mặt hàng — toàn bộ lịch sử ledger của (kho, hàng hóa) theo thứ tự thời gian. */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const khoId = sp.get("kho_id");
    const maHang = sp.get("ma_hang");
    const tuNgay = sp.get("tu_ngay") || null;
    const denNgay = sp.get("den_ngay") || null;
    if (!khoId || !maHang) throw new ApiError(400, "Vui lòng chọn kho và mặt hàng");

    const snap = await adminDb
      .collection("warehouse_ledger")
      .where("khoId", "==", khoId)
      .where("hangHoaId", "==", maHang)
      .orderBy("createdAt", "asc")
      .get();
    let entries = snap.docs.map((d) => d.data() as WarehouseLedgerEntry);
    if (tuNgay) entries = entries.filter((e) => e.createdAt >= tuNgay);
    if (denNgay) entries = entries.filter((e) => e.createdAt <= `${denNgay}T23:59:59.999Z`);

    return NextResponse.json({ items: entries });
  } catch (e) {
    return handleApiError(e);
  }
}
