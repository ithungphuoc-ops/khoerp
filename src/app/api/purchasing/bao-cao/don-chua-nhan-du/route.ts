import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/apiError";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { DonMuaHang } from "@/lib/types/purchasing";

export async function GET() {
  try {
    await requireUser();
    // orderBy trực tiếp trên ngayGiaoDuKien sẽ LOẠI những đơn chưa nhập ngày này
    // (field optional — Firestore orderBy bỏ qua doc thiếu field). Sắp xếp
    // trong bộ nhớ theo ngayDatHang thay vào đó để không mất đơn nào.
    const snap = await adminDb.collection("purchasing_don_hang").orderBy("ngayDatHang", "asc").get();
    const donHangs = snap.docs.map((d) => d.data() as DonMuaHang).filter((d) => d.trangThai !== "huy" && d.trangThai !== "nhan_du");

    const khoCache = new Map<string, { maKho: string; tenKho: string } | null>();
    const items = await Promise.all(
      donHangs.map(async (d) => {
        if (d.khoNhanId && !khoCache.has(d.khoNhanId)) khoCache.set(d.khoNhanId, await getKhoDisplay(d.khoNhanId));
        const tongSoLuongDat = d.chiTiet.reduce((s, ct) => s + ct.soLuongDat, 0);
        const tongSoLuongDaNhan = d.chiTiet.reduce((s, ct) => s + ct.soLuongDaNhan, 0);
        const { chiTiet: _chiTiet, ...rest } = d;
        void _chiTiet;
        return {
          ...rest,
          kho: d.khoNhanId ? khoCache.get(d.khoNhanId) : null,
          tongSoLuongDat,
          tongSoLuongDaNhan,
        };
      })
    );

    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}
