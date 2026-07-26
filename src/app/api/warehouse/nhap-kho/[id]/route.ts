import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { postDocumentMovements, rollbackDocument, writeAudit } from "@/lib/server/warehouseEngine";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { PhieuNhapKho, ChiTietPhieu } from "@/lib/types/warehouse";

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

interface PhieuNhapUpdateBody {
  ngay_hach_toan?: string;
  ngay_chung_tu?: string;
  kho_id?: string;
  nha_cung_cap?: string;
  nguoi_giao?: string;
  ly_do_nhap?: string;
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

async function getPhieuOr404(id: string): Promise<PhieuNhapKho> {
  const snap = await adminDb.collection("warehouse_phieu_nhap").doc(id).get();
  const data = snap.data() as PhieuNhapKho | undefined;
  if (!snap.exists || data?.deletedAt) throw new ApiError(404, "Không tìm thấy phiếu nhập kho");
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
    const body = (await req.json()) as PhieuNhapUpdateBody;

    if (body.chi_tiet !== undefined) {
      try {
        await rollbackDocument({ refType: "nhap_kho", refId: id, userId: user.id });
      } catch (e) {
        throw new ApiError(500, `Lỗi rollback tồn kho: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (body.ngay_hach_toan !== undefined) updateData.ngayHachToan = body.ngay_hach_toan;
    if (body.ngay_chung_tu !== undefined) updateData.ngayChungTu = body.ngay_chung_tu;
    if (body.kho_id !== undefined) updateData.khoId = body.kho_id;
    if (body.nha_cung_cap !== undefined) updateData.nhaCungCap = body.nha_cung_cap;
    if (body.nguoi_giao !== undefined) updateData.nguoiGiao = body.nguoi_giao;
    if (body.ly_do_nhap !== undefined) updateData.lyDoNhap = body.ly_do_nhap;
    if (body.ghi_chu !== undefined) updateData.ghiChu = body.ghi_chu;

    let newChiTiet: ChiTietPhieu[] | undefined;
    if (body.chi_tiet !== undefined) {
      newChiTiet = body.chi_tiet.map((ct, i) => toChiTietPhieu(ct, i + 1));
      updateData.chiTiet = newChiTiet;
      updateData.tongTien = newChiTiet.reduce((sum, ct) => sum + ct.thanhTien, 0);
    }

    await adminDb.collection("warehouse_phieu_nhap").doc(id).set(updateData, { merge: true });

    if (newChiTiet && newChiTiet.length) {
      const newKhoId = body.kho_id || oldPhieu.khoId;
      if (newKhoId) {
        try {
          await postDocumentMovements({
            chiTiet: newChiTiet,
            refType: "nhap_kho",
            refId: id,
            khoId: newKhoId,
            direction: 1,
            transactionType: "IMPORT",
            userId: user.id,
          });
        } catch (e) {
          throw new ApiError(500, `Lỗi áp dụng tồn kho mới: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    await writeAudit({
      action: "UPDATE",
      entityType: "phieu_nhap",
      entityId: id,
      entityNumber: oldPhieu.soChungTu,
      userId: user.id,
      userEmail: user.email,
      oldValues: oldPhieu,
      newValues: updateData,
    });

    return NextResponse.json({ message: "Cập nhật phiếu nhập thành công" });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền xóa phiếu nhập");
    const { id } = await params;
    const phieu = await getPhieuOr404(id);

    try {
      await rollbackDocument({ refType: "nhap_kho", refId: id, userId: user.id });
    } catch (e) {
      throw new ApiError(500, `Lỗi rollback tồn kho khi xóa: ${e instanceof Error ? e.message : String(e)}`);
    }

    await adminDb.collection("warehouse_phieu_nhap").doc(id).set(
      {
        deletedAt: new Date().toISOString(),
        deletedBy: user.id,
        deleteReason: "User deleted",
      },
      { merge: true }
    );

    await writeAudit({
      action: "DELETE",
      entityType: "phieu_nhap",
      entityId: id,
      entityNumber: phieu.soChungTu,
      userId: user.id,
      userEmail: user.email,
      oldValues: phieu,
    });

    return NextResponse.json({ message: "Đã xóa phiếu nhập, tồn kho đã được hoàn nguyên" });
  } catch (e) {
    return handleApiError(e);
  }
}
