import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/apiError";
import type { TonKho, HangHoa } from "@/lib/types/warehouse";

/** Tổng số mặt hàng, tổng giá trị tồn (rough), số mặt hàng hết tồn. */
export async function GET() {
  try {
    await requireUser();

    const snap = await adminDb.collection("warehouse_ton_kho").get();
    const rows = snap.docs.map((d) => d.data() as TonKho);

    // Hàng hóa theo từng kho (doc id = `${khoId}_${hangHoaId}`) — phải ghép đúng
    // khoId của từng dòng, không tra bằng hangHoaId đơn thuần (cùng lỗi như
    // api/warehouse/ton-kho/route.ts).
    const hangHoaKeys = [...new Set(rows.map((r) => `${r.khoId}_${r.hangHoaId}`))];
    const hangHoaDocs = await Promise.all(hangHoaKeys.map((key) => adminDb.collection("warehouse_hang_hoa").doc(key).get()));
    const hangHoaMap = new Map(hangHoaDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as HangHoa]));

    const tongMatHang = rows.length;
    const tongGiaTri = rows.reduce((sum, r) => sum + r.soLuong * (hangHoaMap.get(`${r.khoId}_${r.hangHoaId}`)?.giaNhap ?? 0), 0);
    const hetHang = rows.filter((r) => r.soLuong <= 0).length;

    return NextResponse.json({ tong_mat_hang: tongMatHang, tong_gia_tri: tongGiaTri, het_hang: hetHang });
  } catch (e) {
    return handleApiError(e);
  }
}
