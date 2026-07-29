import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { DonMuaHang, ChiTietDonMuaHang, TrangThaiDonMuaHang } from "@/lib/types/purchasing";

const TRANG_THAI_THU_CONG = new Set<TrangThaiDonMuaHang>(["nhap", "da_gui_ncc", "da_xac_nhan", "huy"]);

interface ChiTietUpdateBody {
  ma_hang?: string;
  ten_hang: string;
  don_vi_tinh?: string;
  so_luong_dat?: number;
  don_gia?: number;
  thue_gtgt?: number;
}

interface DonHangUpdateBody {
  ma_ncc?: string;
  ten_ncc?: string;
  kho_nhan_id?: string;
  phong_ban?: string;
  cong_trinh?: string;
  ngay_dat_hang?: string;
  ngay_giao_du_kien?: string;
  trang_thai?: TrangThaiDonMuaHang;
  chiet_khau_phan_tram?: number;
  ghi_chu?: string;
  chi_tiet?: ChiTietUpdateBody[];
}

function tinhChiTiet(ct: ChiTietUpdateBody, stt: number): ChiTietDonMuaHang {
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const snap = await adminDb.collection("purchasing_don_hang").doc(id).get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy đơn mua hàng");
    const d = snap.data() as DonMuaHang;
    const kho = d.khoNhanId ? await getKhoDisplay(d.khoNhanId) : null;
    return NextResponse.json({ ...d, kho });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const body = (await req.json()) as DonHangUpdateBody;

    const ref = adminDb.collection("purchasing_don_hang").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy đơn mua hàng");
    const existing = snap.data() as DonMuaHang;

    const daNhanMotPhan = existing.chiTiet.some((ct) => ct.soLuongDaNhan > 0);
    if (body.chi_tiet && daNhanMotPhan) {
      throw new ApiError(400, "Đơn đã có hàng nhận — không thể sửa danh sách hàng hóa. Chỉ có thể sửa thông tin chung.");
    }
    if (body.trang_thai !== undefined && !TRANG_THAI_THU_CONG.has(body.trang_thai)) {
      throw new ApiError(400, "Trạng thái không hợp lệ (Nhận một phần/Nhận đủ chỉ do hệ thống tự cập nhật)");
    }

    const data: Record<string, unknown> = {};
    if (body.ma_ncc !== undefined) data.maNCC = body.ma_ncc;
    if (body.ten_ncc !== undefined) data.tenNCC = body.ten_ncc;
    if (body.kho_nhan_id !== undefined) data.khoNhanId = body.kho_nhan_id;
    if (body.phong_ban !== undefined) data.phongBan = body.phong_ban;
    if (body.cong_trinh !== undefined) data.congTrinh = body.cong_trinh;
    if (body.ngay_dat_hang !== undefined) data.ngayDatHang = body.ngay_dat_hang;
    if (body.ngay_giao_du_kien !== undefined) data.ngayGiaoDuKien = body.ngay_giao_du_kien;
    if (body.trang_thai !== undefined) data.trangThai = body.trang_thai;
    if (body.ghi_chu !== undefined) data.ghiChu = body.ghi_chu;

    if (body.chi_tiet || body.chiet_khau_phan_tram !== undefined) {
      const chiTiet = body.chi_tiet ? body.chi_tiet.map((ct, i) => tinhChiTiet(ct, i + 1)) : existing.chiTiet;
      const chietKhauPhanTram = body.chiet_khau_phan_tram !== undefined ? Number(body.chiet_khau_phan_tram) || 0 : existing.chietKhauPhanTram || 0;
      const { tongTienHang, tienChietKhau, tongTienThue, tongTienThanhToan } = tinhTongTien(chiTiet, chietKhauPhanTram);
      if (body.chi_tiet) data.chiTiet = chiTiet;
      data.chietKhauPhanTram = chietKhauPhanTram;
      data.tongTienHang = tongTienHang;
      data.tienChietKhau = tienChietKhau;
      data.tongTienThue = tongTienThue;
      data.tongTienThanhToan = tongTienThanhToan;
    }

    data.updatedAt = new Date().toISOString();
    await ref.set(data, { merge: true });
    const updated = await ref.get();
    return NextResponse.json(updated.data());
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const ref = adminDb.collection("purchasing_don_hang").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy đơn mua hàng");
    const d = snap.data() as DonMuaHang;

    if (d.chiTiet.some((ct) => ct.soLuongDaNhan > 0)) {
      throw new ApiError(400, "Đơn đã có hàng nhận — không thể xóa, vui lòng chuyển trạng thái sang Hủy thay vì xóa");
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
