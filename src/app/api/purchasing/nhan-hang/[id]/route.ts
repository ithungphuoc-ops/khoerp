import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { DonMuaHang, PhieuNhanHang, TrangThaiDonMuaHang } from "@/lib/types/purchasing";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const snap = await adminDb.collection("purchasing_nhan_hang").doc(id).get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy phiếu nhận hàng");
    return NextResponse.json(snap.data());
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền xóa phiếu nhận hàng");
    const { id } = await params;
    const phieuRef = adminDb.collection("purchasing_nhan_hang").doc(id);

    await adminDb.runTransaction(async (tx) => {
      const phieuSnap = await tx.get(phieuRef);
      if (!phieuSnap.exists) throw new ApiError(404, "Không tìm thấy phiếu nhận hàng");
      const phieu = phieuSnap.data() as PhieuNhanHang;

      const donRef = adminDb.collection("purchasing_don_hang").doc(phieu.donMuaHangId);
      const donSnap = await tx.get(donRef);
      if (donSnap.exists) {
        const don = donSnap.data() as DonMuaHang;
        const chiTietMoi = don.chiTiet.map((ct) => ({ ...ct }));
        for (const line of phieu.chiTiet) {
          const ctDon = chiTietMoi[line.stt - 1];
          if (ctDon) ctDon.soLuongDaNhan = Math.max(0, ctDon.soLuongDaNhan - line.soLuongNhan);
        }
        const daDuTatCa = chiTietMoi.every((ct) => ct.soLuongDaNhan >= ct.soLuongDat);
        const coNhanMotPhan = chiTietMoi.some((ct) => ct.soLuongDaNhan > 0);
        let trangThaiMoi: TrangThaiDonMuaHang = don.trangThai;
        if (don.trangThai === "nhan_du" || don.trangThai === "nhan_mot_phan") {
          trangThaiMoi = daDuTatCa ? "nhan_du" : coNhanMotPhan ? "nhan_mot_phan" : "da_xac_nhan";
        }
        tx.update(donRef, { chiTiet: chiTietMoi, trangThai: trangThaiMoi, updatedAt: new Date().toISOString() });
      }

      tx.delete(phieuRef);
    });

    return NextResponse.json({ message: "Đã xóa phiếu nhận hàng, số lượng đã nhận trên đơn mua hàng được hoàn nguyên" });
  } catch (e) {
    return handleApiError(e);
  }
}
