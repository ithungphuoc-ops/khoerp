import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { generateSoChungTu } from "@/lib/server/soChungTu";
import { postDocumentMovements, writeAudit, checkStock, resolveHangHoaId } from "@/lib/server/warehouseEngine";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { PhieuXuatKho, ChiTietPhieuXuat } from "@/lib/types/warehouse";

/**
 * Warehouse — Phiếu Xuất Kho. Số chứng từ: XK-YYYY-00001.
 * Đặc điểm riêng: kiểm tra tồn trước khi xuất (không cho xuất âm mặc định),
 * direction = -1.
 */

interface ChiTietCreateBody {
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

interface PhieuXuatCreateBody {
  ngay_hach_toan: string;
  ngay_chung_tu: string;
  kho_id?: string;
  nguoi_nhan?: string;
  dia_chi?: string;
  nhan_vien_xuat?: string;
  ly_do_xuat?: string;
  phong_ban?: string;
  cong_trinh?: string;
  dia_diem_giao?: string;
  ghi_chu?: string;
  allow_negative?: boolean;
  chi_tiet?: ChiTietCreateBody[];
}

function toChiTietPhieu(ct: ChiTietCreateBody, stt: number): ChiTietPhieuXuat {
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

async function checkStockBeforeExport(khoId: string | undefined, chiTiet: ChiTietPhieuXuat[], allowNegative: boolean) {
  if (allowNegative || !khoId) return;
  const insufficient: string[] = [];
  for (const ct of chiTiet) {
    const hangHoaId = await resolveHangHoaId(ct, khoId);
    if (!hangHoaId || ct.soLuong <= 0) continue;
    const ton = await checkStock(khoId, hangHoaId);
    if (ton < ct.soLuong) {
      insufficient.push(`${ct.tenHang || ct.maHang}: cần ${ct.soLuong}, tồn ${ton}`);
    }
  }
  if (insufficient.length) {
    throw new ApiError(400, `Không đủ tồn kho: ${insufficient.join("; ")}`);
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;
    const khoId = sp.get("kho_id") || null;
    const tuNgay = sp.get("tu_ngay") || null;
    const denNgay = sp.get("den_ngay") || null;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));

    const snap = await adminDb.collection("warehouse_phieu_xuat").orderBy("ngayHachToan", "desc").get();
    let rows = snap.docs.map((d) => d.data() as PhieuXuatKho).filter((p) => !p.deletedAt);

    if (khoId) rows = rows.filter((p) => p.khoId === khoId);
    if (tuNgay) rows = rows.filter((p) => p.ngayHachToan >= tuNgay);
    if (denNgay) rows = rows.filter((p) => p.ngayHachToan <= denNgay);
    if (search) {
      rows = rows.filter(
        (p) =>
          p.soChungTu.toLowerCase().includes(search) ||
          (p.nguoiNhan || "").toLowerCase().includes(search) ||
          (p.lyDoXuat || "").toLowerCase().includes(search) ||
          (p.congTrinh || "").toLowerCase().includes(search)
      );
    }

    const total = rows.length;
    const offset = (page - 1) * limit;
    const pageRows = rows.slice(offset, offset + limit);

    const khoCache = new Map<string, { maKho: string; tenKho: string } | null>();
    const items = await Promise.all(
      pageRows.map(async (p) => {
        if (p.khoId && !khoCache.has(p.khoId)) khoCache.set(p.khoId, await getKhoDisplay(p.khoId));
        const { chiTiet: _chiTiet, ...rest } = p;
        void _chiTiet;
        return { ...rest, kho: p.khoId ? khoCache.get(p.khoId) : null };
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
    const body = (await req.json()) as PhieuXuatCreateBody;
    const chiTietBody = body.chi_tiet || [];
    const chiTiet = chiTietBody.map((ct, i) => toChiTietPhieu(ct, i + 1));

    if (chiTiet.length && body.kho_id) {
      await checkStockBeforeExport(body.kho_id, chiTiet, body.allow_negative || false);
    }

    const tongTien = chiTiet.reduce((sum, ct) => sum + ct.thanhTien, 0);
    const now = new Date().toISOString();

    let soCt = "";
    let phieu: PhieuXuatKho | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      soCt = await generateSoChungTu("warehouse_phieu_xuat", "XK");
      const candidate: PhieuXuatKho = {
        soChungTu: soCt,
        ngayHachToan: body.ngay_hach_toan,
        ngayChungTu: body.ngay_chung_tu,
        khoId: body.kho_id || "",
        nguoiNhan: body.nguoi_nhan,
        diaChi: body.dia_chi,
        nhanVienXuat: body.nhan_vien_xuat,
        lyDoXuat: body.ly_do_xuat || "Xuất kho",
        phongBan: body.phong_ban,
        congTrinh: body.cong_trinh,
        diaDiemGiao: body.dia_diem_giao,
        ghiChu: body.ghi_chu,
        tongTien,
        trangThai: "da_duyet",
        chiTiet,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await adminDb.collection("warehouse_phieu_xuat").doc(soCt).create(candidate);
        phieu = candidate;
        break;
      } catch (e: unknown) {
        if ((e as { code?: number })?.code === 6 && attempt < 2) continue;
        throw new ApiError(500, `Lỗi tạo phiếu xuất: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!phieu) throw new ApiError(500, "Lỗi tạo phiếu xuất: không sinh được số chứng từ duy nhất");

    if (chiTiet.length && body.kho_id) {
      try {
        await postDocumentMovements({
          chiTiet,
          refType: "xuat_kho",
          refId: soCt,
          khoId: body.kho_id,
          direction: -1,
          transactionType: "EXPORT",
          userId: user.id,
        });
      } catch (e) {
        await adminDb.collection("warehouse_phieu_xuat").doc(soCt).delete();
        throw new ApiError(500, `Lỗi cập nhật tồn kho: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await writeAudit({
      action: "CREATE",
      entityType: "phieu_xuat",
      entityId: soCt,
      entityNumber: soCt,
      userId: user.id,
      userEmail: user.email,
      newValues: phieu,
    });

    return NextResponse.json({ message: "Tạo phiếu xuất thành công", id: soCt, so_chung_tu: soCt });
  } catch (e) {
    return handleApiError(e);
  }
}
