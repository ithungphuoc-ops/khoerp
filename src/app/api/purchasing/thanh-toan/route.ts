import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { generateSoChungTu } from "@/lib/server/soChungTu";
import type { PhieuThanhToanNCC, HinhThucThanhToan } from "@/lib/types/purchasing";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const maNCC = sp.get("ma_ncc") || null;
    const donMuaHangId = sp.get("don_mua_hang_id") || null;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));

    const snap = await adminDb.collection("purchasing_thanh_toan").orderBy("ngayThanhToan", "desc").get();
    let rows = snap.docs.map((d) => d.data() as PhieuThanhToanNCC);
    if (maNCC) rows = rows.filter((r) => r.maNCC === maNCC);
    if (donMuaHangId) rows = rows.filter((r) => r.donMuaHangId === donMuaHangId);

    const total = rows.length;
    const offset = (page - 1) * limit;
    const items = rows.slice(offset, offset + limit);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    return handleApiError(e);
  }
}

interface ThanhToanCreateBody {
  ma_ncc: string;
  ten_ncc?: string;
  don_mua_hang_id?: string;
  so_tien: number;
  ngay_thanh_toan: string;
  hinh_thuc?: HinhThucThanhToan;
  ghi_chu?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as ThanhToanCreateBody;
    if (!body.ma_ncc) throw new ApiError(400, "Vui lòng chọn nhà cung cấp");
    if (!body.ngay_thanh_toan) throw new ApiError(400, "Vui lòng chọn ngày thanh toán");
    const soTien = Number(body.so_tien) || 0;
    if (soTien <= 0) throw new ApiError(400, "Số tiền thanh toán phải lớn hơn 0");

    const now = new Date().toISOString();
    let soCt = "";
    let phieu: PhieuThanhToanNCC | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      soCt = await generateSoChungTu("purchasing_thanh_toan", "TT");
      const candidate: PhieuThanhToanNCC = {
        soChungTu: soCt,
        maNCC: body.ma_ncc,
        tenNCC: body.ten_ncc,
        donMuaHangId: body.don_mua_hang_id,
        soTien,
        ngayThanhToan: body.ngay_thanh_toan,
        hinhThuc: body.hinh_thuc,
        ghiChu: body.ghi_chu,
        createdBy: user.id,
        createdAt: now,
      };
      try {
        await adminDb.collection("purchasing_thanh_toan").doc(soCt).create(candidate);
        phieu = candidate;
        break;
      } catch (e: unknown) {
        if ((e as { code?: number })?.code === 6 && attempt < 2) continue;
        throw new ApiError(500, `Lỗi tạo phiếu thanh toán: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!phieu) throw new ApiError(500, "Lỗi tạo phiếu thanh toán: không sinh được số chứng từ duy nhất");

    return NextResponse.json({ message: "Tạo phiếu thanh toán thành công", id: soCt, so_chung_tu: soCt });
  } catch (e) {
    return handleApiError(e);
  }
}
