import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { HangHoa, TonKho, WarehouseLedgerEntry } from "@/lib/types/warehouse";

/**
 * Báo cáo Nhập-Xuất-Tồn theo mặt hàng — dựa hoàn toàn trên "sổ cái" nội bộ
 * (warehouse_ledger) đã ghi sẵn ở mỗi lần nhập/xuất/chuyển/kiểm kê, không
 * cần tính lại tồn kho từ đầu.
 *
 * Lưu ý: lọc theo `createdAt` thật của từng dòng ledger (thời điểm giao dịch
 * thực sự được ghi vào hệ thống), KHÔNG phải "ngày hạch toán" người dùng tự
 * chọn trên phiếu — 2 giá trị này thường trùng nhau trong vận hành bình
 * thường, nhưng nếu có nhập liệu trễ (backdate) thì báo cáo này vẫn tính
 * theo ngày ghi sổ thật.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const khoId = sp.get("kho_id");
    const tuNgay = sp.get("tu_ngay") || null;
    const denNgay = sp.get("den_ngay") || null;
    if (!khoId) throw new ApiError(400, "Vui lòng chọn kho");

    const hhSnap = await adminDb.collection("warehouse_hang_hoa").where("khoId", "==", khoId).where("active", "==", true).get();
    const hangHoaList = hhSnap.docs.map((d) => d.data() as HangHoa);

    const ledgerSnap = await adminDb.collection("warehouse_ledger").where("khoId", "==", khoId).orderBy("createdAt", "asc").get();
    let entries = ledgerSnap.docs.map((d) => d.data() as WarehouseLedgerEntry);
    if (tuNgay) entries = entries.filter((e) => e.createdAt >= tuNgay);
    if (denNgay) entries = entries.filter((e) => e.createdAt <= `${denNgay}T23:59:59.999Z`);

    const byHang = new Map<string, WarehouseLedgerEntry[]>();
    for (const e of entries) {
      if (!byHang.has(e.hangHoaId)) byHang.set(e.hangHoaId, []);
      byHang.get(e.hangHoaId)!.push(e);
    }

    const tonKhoSnaps = await Promise.all(hangHoaList.map((h) => adminDb.collection("warehouse_ton_kho").doc(`${khoId}_${h.maHang}`).get()));
    const tonKhoMap = new Map(hangHoaList.map((h, i) => [h.maHang, tonKhoSnaps[i].exists ? (tonKhoSnaps[i].data() as TonKho).soLuong ?? 0 : 0]));

    const items = hangHoaList.map((h) => {
      const list = byHang.get(h.maHang) || [];
      const current = tonKhoMap.get(h.maHang) ?? 0;
      if (list.length === 0) {
        return { maHang: h.maHang, tenHang: h.tenHang, donViTinh: h.donViTinh, tonDauKy: current, tongNhap: 0, tongXuat: 0, dieuChinhKiemKe: 0, tonCuoiKy: current };
      }
      const first = list[0];
      const last = list[list.length - 1];
      const tongNhap = list.filter((e) => e.direction === 1 && e.transactionType !== "ADJUSTMENT").reduce((s, e) => s + e.soLuong, 0);
      const tongXuat = list.filter((e) => e.direction === -1 && e.transactionType !== "ADJUSTMENT").reduce((s, e) => s + e.soLuong, 0);
      const dieuChinhKiemKe = list.filter((e) => e.transactionType === "ADJUSTMENT").reduce((s, e) => s + e.soLuong * e.direction, 0);
      return { maHang: h.maHang, tenHang: h.tenHang, donViTinh: h.donViTinh, tonDauKy: first.stockBefore, tongNhap, tongXuat, dieuChinhKiemKe, tonCuoiKy: last.stockAfter };
    });

    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}
