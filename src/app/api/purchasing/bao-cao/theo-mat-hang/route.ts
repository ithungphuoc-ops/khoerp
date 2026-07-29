import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/apiError";
import type { DonMuaHang } from "@/lib/types/purchasing";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const tuNgay = sp.get("tu_ngay") || null;
    const denNgay = sp.get("den_ngay") || null;
    const maNCC = sp.get("ma_ncc") || null;

    const snap = await adminDb.collection("purchasing_don_hang").get();
    let donHangs = snap.docs.map((d) => d.data() as DonMuaHang).filter((d) => d.trangThai !== "huy");
    if (tuNgay) donHangs = donHangs.filter((d) => d.ngayDatHang >= tuNgay);
    if (denNgay) donHangs = donHangs.filter((d) => d.ngayDatHang <= denNgay);
    if (maNCC) donHangs = donHangs.filter((d) => d.maNCC === maNCC);

    interface Agg {
      maHang?: string;
      tenHang: string;
      donViTinh?: string;
      soLanMua: number;
      tongSoLuongDat: number;
      tongThanhTien: number;
      tongTienThue: number;
    }
    const map = new Map<string, Agg>();
    for (const d of donHangs) {
      for (const ct of d.chiTiet) {
        const key = ct.maHang || ct.tenHang;
        let a = map.get(key);
        if (!a) {
          a = { maHang: ct.maHang, tenHang: ct.tenHang, donViTinh: ct.donViTinh, soLanMua: 0, tongSoLuongDat: 0, tongThanhTien: 0, tongTienThue: 0 };
          map.set(key, a);
        }
        a.soLanMua += 1;
        a.tongSoLuongDat += ct.soLuongDat;
        a.tongThanhTien += ct.thanhTien;
        a.tongTienThue += ct.tienThue;
      }
    }

    const items = [...map.values()].sort((a, b) => b.tongThanhTien - a.tongThanhTien);
    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}
