import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { postDocumentMovements, rollbackDocument, writeAudit } from "@/lib/server/warehouseEngine";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { PhieuXuatKho, ChiTietPhieuXuat } from "@/lib/types/warehouse";

interface ChiTietBody {
  ma_hang?: string;
  ten_hang?: string;
  hang_hoa_id?: string;
  don_vi_tinh?: string;
  so_luong?: number;
  don_gia?: number;
  tk_no?: string;
  tk_co?: string;
  cong_trinh?: string;
  ghi_chu?: string;
}

interface PhieuXuatUpdateBody {
  ngay_hach_toan?: string;
  ngay_chung_tu?: string;
  kho_id?: string;
  nguoi_nhan?: string;
  dia_chi?: string;
  nhan_vien_xuat?: string;
  ly_do_xuat?: string;
  phong_ban?: string;
  cong_trinh?: string;
  ghi_chu?: string;
  chi_tiet?: ChiTietBody[];
}

function toChiTietPhieu(ct: ChiTietBody, stt: number): ChiTietPhieuXuat {
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
    congTrinh: ct.cong_trinh,
    ghiChu: ct.ghi_chu,
    tkNo: ct.tk_no,
    tkCo: ct.tk_co,
  };
}

async function getPhieuOr404(id: string): Promise<PhieuXuatKho> {
  const snap = await adminDb.collection("warehouse_phieu_xuat").doc(id).get();
  const data = snap.data() as PhieuXuatKho | undefined;
  if (!snap.exists || data?.deletedAt) throw new ApiError(404, "Không tìm thấy phiếu xuất kho");
  return data!;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const phieu = await getPhieuOr404(id);
    const kho = await getKhoDisplay(phieu.khoId);
    return NextResponse.json({ ...phieu, kho });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const oldPhieu = await getPhieuOr404(id);
    const body = (await req.json()) as PhieuXuatUpdateBody;

    if (body.chi_tiet !== undefined) {
      try {
        await rollbackDocument({ refType: "xuat_kho", refId: id, userId: user.id });
      } catch (e) {
        throw new ApiError(500, `Lỗi rollback tồn kho: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (body.ngay_hach_toan !== undefined) updateData.ngayHachToan = body.ngay_hach_toan;
    if (body.ngay_chung_tu !== undefined) updateData.ngayChungTu = body.ngay_chung_tu;
    if (body.kho_id !== undefined) updateData.khoId = body.kho_id;
    if (body.nguoi_nhan !== undefined) updateData.nguoiNhan = body.nguoi_nhan;
    if (body.dia_chi !== undefined) updateData.diaChi = body.dia_chi;
    if (body.nhan_vien_xuat !== undefined) updateData.nhanVienXuat = body.nhan_vien_xuat;
    if (body.ly_do_xuat !== undefined) updateData.lyDoXuat = body.ly_do_xuat;
    if (body.phong_ban !== undefined) updateData.phongBan = body.phong_ban;
    if (body.cong_trinh !== undefined) updateData.congTrinh = body.cong_trinh;
    if (body.ghi_chu !== undefined) updateData.ghiChu = body.ghi_chu;

    let newChiTiet: ChiTietPhieuXuat[] | undefined;
    if (body.chi_tiet !== undefined) {
      newChiTiet = body.chi_tiet.map((ct, i) => toChiTietPhieu(ct, i + 1));
      updateData.chiTiet = newChiTiet;
      updateData.tongTien = newChiTiet.reduce((sum, ct) => sum + ct.thanhTien, 0);
    }

    await adminDb.collection("warehouse_phieu_xuat").doc(id).set(updateData, { merge: true });

    if (newChiTiet && newChiTiet.length) {
      const newKhoId = body.kho_id || oldPhieu.khoId;
      if (newKhoId) {
        try {
          await postDocumentMovements({
            chiTiet: newChiTiet,
            refType: "xuat_kho",
            refId: id,
            khoId: newKhoId,
            direction: -1,
            transactionType: "EXPORT",
            userId: user.id,
          });
        } catch (e) {
          throw new ApiError(500, `Lỗi áp dụng tồn kho mới: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    await writeAudit({
      action: "UPDATE",
      entityType: "phieu_xuat",
      entityId: id,
      entityNumber: oldPhieu.soChungTu,
      userId: user.id,
      userEmail: user.email,
      oldValues: oldPhieu,
      newValues: updateData,
    });

    return NextResponse.json({ message: "Cập nhật phiếu xuất thành công" });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền xóa phiếu xuất");
    const { id } = await params;
    const phieu = await getPhieuOr404(id);

    try {
      await rollbackDocument({ refType: "xuat_kho", refId: id, userId: user.id });
    } catch (e) {
      throw new ApiError(500, `Lỗi rollback tồn kho khi xóa: ${e instanceof Error ? e.message : String(e)}`);
    }

    await adminDb.collection("warehouse_phieu_xuat").doc(id).set(
      {
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
        deleteReason: "User deleted",
      },
      { merge: true }
    );

    await writeAudit({
      action: "DELETE",
      entityType: "phieu_xuat",
      entityId: id,
      entityNumber: phieu.soChungTu,
      userId: user.id,
      userEmail: user.email,
      oldValues: phieu,
    });

    return NextResponse.json({ message: "Đã xóa phiếu xuất, tồn kho đã được hoàn nguyên" });
  } catch (e) {
    return handleApiError(e);
  }
}
