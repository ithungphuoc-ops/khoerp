import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/apiError";
import type { DonMuaHang, PhieuThanhToanNCC, NhaCungCap } from "@/lib/types/purchasing";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Công nợ được TÍNH ĐỘNG từ purchasing_don_hang (trừ đơn "huy") và
 * purchasing_thanh_toan — không lưu số dư sẵn để tránh lệch dữ liệu.
 *
 * "Nợ quá hạn" tính theo TỪNG ĐƠN: hạn thanh toán = ngayDatHang + soNgayDuocNo
 * (lấy từ danh mục NCC). Chỉ trừ các phiếu thanh toán ĐÃ GẮN đúng đơn đó khi
 * tính số dư còn lại của đơn — thanh toán chung/ứng trước không gắn đơn cụ
 * thể chỉ làm giảm "Tổng nợ phải trả" theo NCC, không xóa trạng thái quá hạn
 * của một đơn cụ thể. Đơn của NCC chưa khai báo "Số ngày được nợ" (hoặc = 0)
 * không tính quá hạn vì không có cơ sở kỳ hạn.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const maNCCFilter = sp.get("ma_ncc") || null;

    const [donSnap, ttSnap, nccSnap] = await Promise.all([
      adminDb.collection("purchasing_don_hang").get(),
      adminDb.collection("purchasing_thanh_toan").get(),
      adminDb.collection("purchasing_ncc").get(),
    ]);

    const donHangs = donSnap.docs.map((d) => d.data() as DonMuaHang).filter((d) => d.trangThai !== "huy");
    const thanhToans = ttSnap.docs.map((d) => d.data() as PhieuThanhToanNCC);
    const nccMap = new Map<string, NhaCungCap>(nccSnap.docs.map((d) => [d.id, d.data() as NhaCungCap]));

    const today = new Date();

    interface Agg {
      maNCC: string;
      tenNCC: string;
      tongDatHang: number;
      daThanhToan: number;
      conNo: number;
    }
    const aggMap = new Map<string, Agg>();
    function getAgg(maNCC: string, tenNCC?: string): Agg {
      let a = aggMap.get(maNCC);
      if (!a) {
        a = { maNCC, tenNCC: tenNCC || nccMap.get(maNCC)?.ten || maNCC, tongDatHang: 0, daThanhToan: 0, conNo: 0 };
        aggMap.set(maNCC, a);
      }
      return a;
    }

    for (const d of donHangs) {
      const a = getAgg(d.maNCC, d.tenNCC);
      a.tongDatHang += d.tongTienThanhToan;
    }
    for (const t of thanhToans) {
      const a = getAgg(t.maNCC, t.tenNCC);
      a.daThanhToan += t.soTien;
    }
    for (const a of aggMap.values()) a.conNo = a.tongDatHang - a.daThanhToan;

    let noQuaHan = 0;
    for (const d of donHangs) {
      const ncc = nccMap.get(d.maNCC);
      const soNgayDuocNo = ncc?.soNgayDuocNo || 0;
      if (soNgayDuocNo <= 0) continue;
      const hanThanhToan = new Date(d.ngayDatHang);
      hanThanhToan.setDate(hanThanhToan.getDate() + soNgayDuocNo);
      if (today <= hanThanhToan) continue;

      const daThanhToanChoDon = thanhToans.filter((t) => t.donMuaHangId === d.soChungTu).reduce((s, t) => s + t.soTien, 0);
      const conNoDon = d.tongTienThanhToan - daThanhToanChoDon;
      if (conNoDon > 0) noQuaHan += conNoDon;
    }

    const nguong30Ngay = new Date(today.getTime() - 30 * MS_PER_DAY);
    const daThanhToan30Ngay = thanhToans.filter((t) => new Date(t.ngayThanhToan) >= nguong30Ngay).reduce((s, t) => s + t.soTien, 0);

    const tongNoPhaiTra = [...aggMap.values()].reduce((s, a) => s + a.conNo, 0);

    let theoNCC = [...aggMap.values()];
    if (maNCCFilter) theoNCC = theoNCC.filter((a) => a.maNCC === maNCCFilter);

    return NextResponse.json({ tongNoPhaiTra, noQuaHan, daThanhToan30Ngay, theoNCC });
  } catch (e) {
    return handleApiError(e);
  }
}
