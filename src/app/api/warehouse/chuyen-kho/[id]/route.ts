import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { postTransferMovements, rollbackDocument, writeAudit } from "@/lib/server/warehouseEngine";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { PhieuChuyenKho, ChiTietPhieu } from "@/lib/types/warehouse";

interface ChiTietBody {
  ma_hang?: string;
  ten_hang?: string;
  hang_hoa_id?: string;
  don_vi_tinh?: string;
  so_luong?: number;
  don_gia?: number;
  tk_no?: string;
  tk_co?: string;
  ghi_chu?: string;
}

interface PhieuChuyenUpdateBody {
  ngay_hach_toan?: string;
  ngay_chung_tu?: string;
  kho_xuat_id?: string;
  kho_nhap_id?: string;
  nguoi_chuyen?: string;
  ly_do_chuyen?: string;
  ghi_chu?: string;
  chi_tiet?: ChiTietBody[];
}

function toChiTietPhieu(ct: ChiTietBody, stt: number): ChiTietPhieu {
  const soLuong = Number(ct.so_luong) || 0;
  const donGia = Number(ct.don_gia) || 0;
  return {
    stt,
    hangHoaId: ct.hang_hoa_id || ct.ma_hang || "",
    maHang: ct.ma_hang || "",
    tenHang: ct.ten_hang || "",
    donViTinh: ct.don_vi_tinh,
    soLuong,
    donGia,
    thanhTien: soLuong * donGia,
    ghiChu: ct.ghi_chu,
    tkNo: ct.tk_no,
    tkCo: ct.tk_co,
  };
}

async function getPhieuOr404(id: string): Promise<PhieuChuyenKho> {
  const snap = await adminDb.collection("warehouse_phieu_chuyen").doc(id).get();
  const data = snap.data() as PhieuChuyenKho | undefined;
  if (!snap.exists || data?.deletedAt) throw new ApiError(404, "Không tìm thấy phiếu chuyển kho");
  return data!;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const phieu = await getPhieuOr404(id);
    const [khoXuat, khoNhap] = await Promise.all([
      getKhoDisplay(phieu.khoXuatId),
      getKhoDisplay(phieu.khoNhapId),
    ]);
    return NextResponse.json({ ...phieu, kho_xuat: khoXuat, kho_nhap: khoNhap });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const oldPhieu = await getPhieuOr404(id);
    const body = (await req.json()) as PhieuChuyenUpdateBody;

    const newXuat = body.kho_xuat_id || oldPhieu.khoXuatId;
    const newNhap = body.kho_nhap_id || oldPhieu.khoNhapId;
    if (newXuat && newNhap && newXuat === newNhap) {
      throw new ApiError(400, "Kho xuất và kho nhập không được trùng nhau");
    }

    if (body.chi_tiet !== undefined) {
      try {
        await rollbackDocument({ refType: "chuyen_kho", refId: id, userId: user.id });
      } catch (e) {
        throw new ApiError(500, `Lỗi rollback tồn kho: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (body.ngay_hach_toan !== undefined) updateData.ngayHachToan = body.ngay_hach_toan;
    if (body.ngay_chung_tu !== undefined) updateData.ngayChungTu = body.ngay_chung_tu;
    if (body.kho_xuat_id !== undefined) updateData.khoXuatId = body.kho_xuat_id;
    if (body.kho_nhap_id !== undefined) updateData.khoNhapId = body.kho_nhap_id;
    if (body.nguoi_chuyen !== undefined) updateData.nguoiChuyen = body.nguoi_chuyen;
    if (body.ly_do_chuyen !== undefined) updateData.lyDoChuyen = body.ly_do_chuyen;
    if (body.ghi_chu !== undefined) updateData.ghiChu = body.ghi_chu;

    let newChiTiet: ChiTietPhieu[] | undefined;
    if (body.chi_tiet !== undefined) {
      newChiTiet = body.chi_tiet.map((ct, i) => toChiTietPhieu(ct, i + 1));
      updateData.chiTiet = newChiTiet;
      updateData.tongSoLuong = newChiTiet.reduce((sum, ct) => sum + ct.soLuong, 0);
    }

    await adminDb.collection("warehouse_phieu_chuyen").doc(id).set(updateData, { merge: true });

    if (newChiTiet && newChiTiet.length && newXuat && newNhap) {
      try {
        await postTransferMovements({
          chiTiet: newChiTiet,
          refId: id,
          khoXuatId: newXuat,
          khoNhapId: newNhap,
          userId: user.id,
        });
      } catch (e) {
        throw new ApiError(500, `Lỗi áp dụng tồn kho mới: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await writeAudit({
      action: "UPDATE",
      entityType: "phieu_chuyen",
      entityId: id,
      entityNumber: oldPhieu.soChungTu,
      userId: user.id,
      userEmail: user.email,
      oldValues: oldPhieu,
      newValues: updateData,
    });

    return NextResponse.json({ message: "Cập nhật phiếu chuyển kho thành công" });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền xóa phiếu chuyển kho");
    const { id } = await params;
    const phieu = await getPhieuOr404(id);

    try {
      await rollbackDocument({ refType: "chuyen_kho", refId: id, userId: user.id });
    } catch (e) {
      throw new ApiError(500, `Lỗi rollback tồn kho khi xóa: ${e instanceof Error ? e.message : String(e)}`);
    }

    await adminDb.collection("warehouse_phieu_chuyen").doc(id).set(
      {
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
        deleteReason: "User deleted",
      },
      { merge: true }
    );

    await writeAudit({
      action: "DELETE",
      entityType: "phieu_chuyen",
      entityId: id,
      entityNumber: phieu.soChungTu,
      userId: user.id,
      userEmail: user.email,
      oldValues: phieu,
    });

    return NextResponse.json({ message: "Đã xóa phiếu chuyển kho, tồn kho 2 kho đã được hoàn nguyên" });
  } catch (e) {
    return handleApiError(e);
  }
}
