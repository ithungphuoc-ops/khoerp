import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { generateSoChungTu } from "@/lib/server/soChungTu";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { DonMuaHang, ChiTietDonMuaHang, TrangThaiDonMuaHang, CongNoTinhTu } from "@/lib/types/purchasing";

/** Trạng thái người dùng được phép chọn tay khi tạo/sửa đơn — "nhan_mot_phan"/"nhan_du" chỉ do Phiếu Nhận hàng (Phần D) tự set. */
const TRANG_THAI_THU_CONG = new Set<TrangThaiDonMuaHang>(["nhap", "da_gui_ncc", "da_xac_nhan", "huy"]);

interface ChiTietCreateBody {
  ma_hang?: string;
  ten_hang: string;
  don_vi_tinh?: string;
  so_luong_dat?: number;
  don_gia?: number;
  thue_gtgt?: number;
}

interface DonHangCreateBody {
  ma_ncc: string;
  ten_ncc?: string;
  kho_nhan_id?: string;
  phong_ban?: string;
  cong_trinh?: string;
  ngay_dat_hang: string;
  ngay_giao_du_kien?: string;
  trang_thai?: TrangThaiDonMuaHang;
  chiet_khau_phan_tram?: number;
  cong_no_ngay?: number;
  cong_no_tinh_tu?: CongNoTinhTu;
  ngay_hoa_don?: string;
  ngay_giao_hang_thuc_te?: string;
  ghi_chu?: string;
  chi_tiet?: ChiTietCreateBody[];
}

function tinhChiTiet(ct: ChiTietCreateBody, stt: number): ChiTietDonMuaHang {
  const soLuongDat = Number(ct.so_luong_dat) || 0;
  const donGia = Number(ct.don_gia) || 0;
  const thueGtgt = Number(ct.thue_gtgt) || 0;
  const thanhTien = soLuongDat * donGia;
  const tienThue = (thanhTien * thueGtgt) / 100;
  return {
    stt,
    maHang: ct.ma_hang,
    tenHang: ct.ten_hang,
    donViTinh: ct.don_vi_tinh,
    soLuongDat,
    donGia,
    thueGtgt,
    tienThue,
    thanhTien,
    soLuongDaNhan: 0,
  };
}

function tinhTongTien(chiTiet: ChiTietDonMuaHang[], chietKhauPhanTram: number) {
  const tongTienHang = chiTiet.reduce((s, ct) => s + ct.thanhTien, 0);
  const tongTienThue = chiTiet.reduce((s, ct) => s + ct.tienThue, 0);
  const tienChietKhau = (tongTienHang * chietKhauPhanTram) / 100;
  const tongTienThanhToan = tongTienHang - tienChietKhau + tongTienThue;
  return { tongTienHang, tienChietKhau, tongTienThue, tongTienThanhToan };
}

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;
    const trangThai = sp.get("trang_thai") || null;
    const maNCC = sp.get("ma_ncc") || null;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));

    const snap = await adminDb.collection("purchasing_don_hang").orderBy("ngayDatHang", "desc").get();
    let rows = snap.docs.map((d) => d.data() as DonMuaHang);

    if (maNCC) rows = rows.filter((d) => d.maNCC === maNCC);
    if (trangThai) rows = rows.filter((d) => d.trangThai === trangThai);
    if (search) {
      rows = rows.filter((d) => d.soChungTu.toLowerCase().includes(search) || (d.tenNCC || "").toLowerCase().includes(search));
    }

    const total = rows.length;
    const offset = (page - 1) * limit;
    const pageRows = rows.slice(offset, offset + limit);

    const khoCache = new Map<string, { maKho: string; tenKho: string } | null>();
    const items = await Promise.all(
      pageRows.map(async (d) => {
        if (d.khoNhanId && !khoCache.has(d.khoNhanId)) khoCache.set(d.khoNhanId, await getKhoDisplay(d.khoNhanId));
        const { chiTiet: _chiTiet, ...rest } = d;
        void _chiTiet;
        return { ...rest, kho: d.khoNhanId ? khoCache.get(d.khoNhanId) : null };
      })
    );

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as DonHangCreateBody;
    if (!body.ma_ncc) throw new ApiError(400, "Vui lòng chọn nhà cung cấp");
    if (!body.ngay_dat_hang) throw new ApiError(400, "Vui lòng chọn ngày đặt hàng");

    const chiTietBody = body.chi_tiet || [];
    if (chiTietBody.length === 0) throw new ApiError(400, "Đơn mua hàng cần ít nhất 1 dòng hàng");
    const chiTiet = chiTietBody.map((ct, i) => tinhChiTiet(ct, i + 1));
    const chietKhauPhanTram = Number(body.chiet_khau_phan_tram) || 0;
    const { tongTienHang, tienChietKhau, tongTienThue, tongTienThanhToan } = tinhTongTien(chiTiet, chietKhauPhanTram);

    const trangThai = body.trang_thai && TRANG_THAI_THU_CONG.has(body.trang_thai) ? body.trang_thai : "nhap";
    const now = new Date().toISOString();

    let soCt = "";
    let donHang: DonMuaHang | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      soCt = await generateSoChungTu("purchasing_don_hang", "DH");
      const candidate: DonMuaHang = {
        soChungTu: soCt,
        maNCC: body.ma_ncc,
        tenNCC: body.ten_ncc,
        khoNhanId: body.kho_nhan_id,
        phongBan: body.phong_ban,
        congTrinh: body.cong_trinh,
        ngayDatHang: body.ngay_dat_hang,
        ngayGiaoDuKien: body.ngay_giao_du_kien,
        trangThai,
        chiTiet,
        chietKhauPhanTram,
        tongTienHang,
        tienChietKhau,
        tongTienThue,
        tongTienThanhToan,
        congNoNgay: body.cong_no_ngay !== undefined ? Number(body.cong_no_ngay) || undefined : undefined,
        congNoTinhTu: body.cong_no_tinh_tu,
        ngayHoaDon: body.ngay_hoa_don,
        ngayGiaoHangThucTe: body.ngay_giao_hang_thuc_te,
        ghiChu: body.ghi_chu,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await adminDb.collection("purchasing_don_hang").doc(soCt).create(candidate);
        donHang = candidate;
        break;
      } catch (e: unknown) {
        if ((e as { code?: number })?.code === 6 && attempt < 2) continue;
        throw new ApiError(500, `Lỗi tạo đơn mua hàng: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!donHang) throw new ApiError(500, "Lỗi tạo đơn mua hàng: không sinh được số chứng từ duy nhất");

    return NextResponse.json({ message: "Tạo đơn mua hàng thành công", id: soCt, so_chung_tu: soCt });
  } catch (e) {
    return handleApiError(e);
  }
}
