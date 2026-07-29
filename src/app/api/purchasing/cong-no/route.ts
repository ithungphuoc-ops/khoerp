import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/apiError";
import type { DonMuaHang, PhieuThanhToanNCC, NhaCungCap, CongNoTinhTu } from "@/lib/types/purchasing";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type TrangThaiCongNoDon = "da_thanh_toan" | "chua_xac_dinh" | "chua_toi_han" | "qua_han";

interface CongNoDonRow {
  soChungTu: string;
  maNCC: string;
  tenNCC: string;
  tongTienThanhToan: number;
  daThanhToanChoDon: number;
  conNoDon: number;
  congNoNgay: number | null;
  congNoTinhTu: CongNoTinhTu;
  ngayCoSo: string | null;
  hanThanhToan: string | null;
  soNgayConLai: number | null;
  trangThai: TrangThaiCongNoDon;
}

/**
 * Tính công nợ 1 đơn: hạn thanh toán = ngày cơ sở (ngày hóa đơn HOẶC ngày
 * giao hàng thực tế — cả 2 đều NHẬP TAY trên đơn, không tự suy ra) + số ngày
 * công nợ (ưu tiên riêng của đơn `congNoNgay`, không có thì lấy mặc định của
 * NCC `soNgayDuocNo`). Thiếu ngày cơ sở tương ứng hoặc chưa có số ngày công
 * nợ nào cả → "chua_xac_dinh" (không đủ dữ liệu để tính hạn).
 */
function tinhCongNoDon(d: DonMuaHang, ncc: NhaCungCap | undefined, thanhToans: PhieuThanhToanNCC[], today: Date): CongNoDonRow {
  const daThanhToanChoDon = thanhToans.filter((t) => t.donMuaHangId === d.soChungTu).reduce((s, t) => s + t.soTien, 0);
  const conNoDon = d.tongTienThanhToan - daThanhToanChoDon;

  const congNoNgay = d.congNoNgay ?? ncc?.soNgayDuocNo ?? null;
  const congNoTinhTu: CongNoTinhTu = d.congNoTinhTu || "ngay_giao_hang";
  const ngayCoSo = (congNoTinhTu === "ngay_hoa_don" ? d.ngayHoaDon : d.ngayGiaoHangThucTe) || null;

  let hanThanhToanDate: Date | null = null;
  if (ngayCoSo && congNoNgay && congNoNgay > 0) {
    hanThanhToanDate = new Date(ngayCoSo);
    hanThanhToanDate.setDate(hanThanhToanDate.getDate() + congNoNgay);
  }

  let trangThai: TrangThaiCongNoDon;
  let soNgayConLai: number | null = null;
  if (conNoDon <= 0) {
    trangThai = "da_thanh_toan";
  } else if (!hanThanhToanDate) {
    trangThai = "chua_xac_dinh";
  } else {
    soNgayConLai = Math.round((hanThanhToanDate.getTime() - today.getTime()) / MS_PER_DAY);
    trangThai = soNgayConLai < 0 ? "qua_han" : "chua_toi_han";
  }

  return {
    soChungTu: d.soChungTu,
    maNCC: d.maNCC,
    tenNCC: d.tenNCC || ncc?.ten || d.maNCC,
    tongTienThanhToan: d.tongTienThanhToan,
    daThanhToanChoDon,
    conNoDon,
    congNoNgay,
    congNoTinhTu,
    ngayCoSo,
    hanThanhToan: hanThanhToanDate ? hanThanhToanDate.toISOString().slice(0, 10) : null,
    soNgayConLai,
    trangThai,
  };
}

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

    let theoDon = donHangs.map((d) => tinhCongNoDon(d, nccMap.get(d.maNCC), thanhToans, today));
    const noQuaHan = theoDon.filter((r) => r.trangThai === "qua_han").reduce((s, r) => s + r.conNoDon, 0);

    const nguong30Ngay = new Date(today.getTime() - 30 * MS_PER_DAY);
    const daThanhToan30Ngay = thanhToans.filter((t) => new Date(t.ngayThanhToan) >= nguong30Ngay).reduce((s, t) => s + t.soTien, 0);

    const tongNoPhaiTra = [...aggMap.values()].reduce((s, a) => s + a.conNo, 0);

    let theoNCC = [...aggMap.values()];
    if (maNCCFilter) {
      theoNCC = theoNCC.filter((a) => a.maNCC === maNCCFilter);
      theoDon = theoDon.filter((r) => r.maNCC === maNCCFilter);
    }

    return NextResponse.json({ tongNoPhaiTra, noQuaHan, daThanhToan30Ngay, theoNCC, theoDon });
  } catch (e) {
    return handleApiError(e);
  }
}
