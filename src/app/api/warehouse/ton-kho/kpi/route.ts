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

    const hangHoaIds = [...new Set(rows.map((r) => r.hangHoaId))];
    const hangHoaDocs = await Promise.all(hangHoaIds.map((id) => adminDb.collection("warehouse_hang_hoa").doc(id).get()));
    const hangHoaMap = new Map(hangHoaDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as HangHoa]));

    const tongMatHang = rows.length;
    const tongGiaTri = rows.reduce((sum, r) => sum + r.soLuong * (hangHoaMap.get(r.hangHoaId)?.giaNhap ?? 0), 0);
    const hetHang = rows.filter((r) => r.soLuong <= 0).length;

    return NextResponse.json({ tong_mat_hang: tongMatHang, tong_gia_tri: tongGiaTri, het_hang: hetHang });
  } catch (e) {
    return handleApiError(e);
  }
}
