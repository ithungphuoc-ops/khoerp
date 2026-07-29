import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { generateSoChungTu } from "@/lib/server/soChungTu";
import type { DonMuaHang, PhieuNhanHang, ChiTietNhanHang, TrangThaiDonMuaHang } from "@/lib/types/purchasing";

interface ChiTietNhanBody {
  stt: number;
  so_luong_nhan: number;
  ghi_chu?: string;
}

interface NhanHangCreateBody {
  don_mua_hang_id: string;
  ngay_nhan: string;
  nguoi_nhan?: string;
  ghi_chu?: string;
  chi_tiet: ChiTietNhanBody[];
}

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const donMuaHangId = sp.get("don_mua_hang_id") || null;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));

    const snap = await adminDb.collection("purchasing_nhan_hang").orderBy("ngayNhan", "desc").get();
    let rows = snap.docs.map((d) => d.data() as PhieuNhanHang);
    if (donMuaHangId) rows = rows.filter((r) => r.donMuaHangId === donMuaHangId);

    const total = rows.length;
    const offset = (page - 1) * limit;
    const items = rows.slice(offset, offset + limit);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as NhanHangCreateBody;
    if (!body.don_mua_hang_id) throw new ApiError(400, "Vui lòng chọn đơn mua hàng");
    if (!body.ngay_nhan) throw new ApiError(400, "Vui lòng chọn ngày nhận hàng");
    if (!body.chi_tiet?.length) throw new ApiError(400, "Vui lòng nhập số lượng nhận cho ít nhất 1 dòng hàng");

    const donRef = adminDb.collection("purchasing_don_hang").doc(body.don_mua_hang_id);
    const now = new Date().toISOString();

    let savedPhieu: PhieuNhanHang | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidateSoCt = await generateSoChungTu("purchasing_nhan_hang", "NH");
      const phieuRef = adminDb.collection("purchasing_nhan_hang").doc(candidateSoCt);
      try {
        savedPhieu = await adminDb.runTransaction(async (tx) => {
          const [phieuSnap, donSnap] = await Promise.all([tx.get(phieuRef), tx.get(donRef)]);
          if (phieuSnap.exists) {
            const collision = new Error("collision") as Error & { code?: number };
            collision.code = 6;
            throw collision;
          }
          if (!donSnap.exists) throw new ApiError(404, "Không tìm thấy đơn mua hàng");
          const don = donSnap.data() as DonMuaHang;
          if (don.trangThai === "huy") throw new ApiError(400, "Đơn đã hủy, không thể nhận hàng");

          const chiTietMoi = don.chiTiet.map((ct) => ({ ...ct }));
          const phieuChiTiet: ChiTietNhanHang[] = [];
          for (const line of body.chi_tiet) {
            const idx = (Number(line.stt) || 0) - 1;
            const ctDon = chiTietMoi[idx];
            if (!ctDon) throw new ApiError(400, `Không tìm thấy dòng hàng số ${line.stt} trong đơn`);
            const soLuongNhan = Number(line.so_luong_nhan) || 0;
            if (soLuongNhan <= 0) continue;
            const conLai = ctDon.soLuongDat - ctDon.soLuongDaNhan;
            if (soLuongNhan > conLai) {
              throw new ApiError(400, `"${ctDon.tenHang}": số lượng nhận (${soLuongNhan}) vượt quá số lượng còn lại (${conLai})`);
            }
            ctDon.soLuongDaNhan += soLuongNhan;
            phieuChiTiet.push({
              stt: line.stt,
              maHang: ctDon.maHang,
              tenHang: ctDon.tenHang,
              donViTinh: ctDon.donViTinh,
              soLuongDat: ctDon.soLuongDat,
              soLuongNhan,
              ghiChu: line.ghi_chu,
            });
          }
          if (phieuChiTiet.length === 0) throw new ApiError(400, "Vui lòng nhập số lượng nhận cho ít nhất 1 dòng hàng");

          const daDuTatCa = chiTietMoi.every((ct) => ct.soLuongDaNhan >= ct.soLuongDat);
          const coNhanMotPhan = chiTietMoi.some((ct) => ct.soLuongDaNhan > 0);
          const trangThaiMoi: TrangThaiDonMuaHang = daDuTatCa ? "nhan_du" : coNhanMotPhan ? "nhan_mot_phan" : don.trangThai;

          const phieu: PhieuNhanHang = {
            soChungTu: candidateSoCt,
            donMuaHangId: body.don_mua_hang_id,
            ngayNhan: body.ngay_nhan,
            nguoiNhan: body.nguoi_nhan,
            chiTiet: phieuChiTiet,
            ghiChu: body.ghi_chu,
            createdBy: user.id,
            createdAt: now,
          };
          tx.set(phieuRef, phieu);
          tx.update(donRef, { chiTiet: chiTietMoi, trangThai: trangThaiMoi, updatedAt: now });
          return phieu;
        });
        break;
      } catch (e: unknown) {
        if (e instanceof ApiError) throw e;
        if ((e as { code?: number })?.code === 6 && attempt < 2) continue;
        throw new ApiError(500, `Lỗi tạo phiếu nhận hàng: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!savedPhieu) throw new ApiError(500, "Lỗi tạo phiếu nhận hàng: không sinh được số chứng từ duy nhất");

    return NextResponse.json({ message: "Tạo phiếu nhận hàng thành công", id: savedPhieu.soChungTu, so_chung_tu: savedPhieu.soChungTu });
  } catch (e) {
    return handleApiError(e);
  }
}
