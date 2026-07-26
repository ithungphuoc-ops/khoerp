import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { generateSoChungTu } from "@/lib/server/soChungTu";
import { postDocumentMovements, writeAudit } from "@/lib/server/warehouseEngine";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { PhieuNhapKho, ChiTietPhieu } from "@/lib/types/warehouse";

/**
 * Warehouse — Phiếu Nhập Kho. Số chứng từ: NK-YYYY-00001.
 * Mọi cập nhật tồn kho đi qua WarehouseEngine — route KHÔNG được ghi thẳng
 * warehouse_ton_kho.
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
  ghi_chu?: string;
}

interface PhieuNhapCreateBody {
  ngay_hach_toan: string;
  ngay_chung_tu: string;
  kho_id?: string;
  nha_cung_cap?: string;
  nguoi_giao?: string;
  ly_do_nhap?: string;
  ghi_chu?: string;
  chi_tiet?: ChiTietCreateBody[];
}

function toChiTietPhieu(ct: ChiTietCreateBody, stt: number): ChiTietPhieu {
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

    const snap = await adminDb.collection("warehouse_phieu_nhap").orderBy("ngayHachToan", "desc").get();
    let rows = snap.docs.map((d) => d.data() as PhieuNhapKho).filter((p) => !p.deletedAt);

    if (khoId) rows = rows.filter((p) => p.khoId === khoId);
    if (tuNgay) rows = rows.filter((p) => p.ngayHachToan >= tuNgay);
    if (denNgay) rows = rows.filter((p) => p.ngayHachToan <= denNgay);
    if (search) {
      rows = rows.filter(
        (p) =>
          p.soChungTu.toLowerCase().includes(search) ||
          (p.nhaCungCap || "").toLowerCase().includes(search) ||
          (p.lyDoNhap || "").toLowerCase().includes(search)
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
    const body = (await req.json()) as PhieuNhapCreateBody;
    const chiTietBody = body.chi_tiet || [];
    const chiTiet = chiTietBody.map((ct, i) => toChiTietPhieu(ct, i + 1));
    const tongTien = chiTiet.reduce((sum, ct) => sum + ct.thanhTien, 0);
    const now = new Date().toISOString();

    let soCt = "";
    let phieu: PhieuNhapKho | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      soCt = await generateSoChungTu("warehouse_phieu_nhap", "NK");
      const candidate: PhieuNhapKho = {
        soChungTu: soCt,
        ngayHachToan: body.ngay_hach_toan,
        ngayChungTu: body.ngay_chung_tu,
        khoId: body.kho_id || "",
        nhaCungCap: body.nha_cung_cap,
        nguoiGiao: body.nguoi_giao,
        lyDoNhap: body.ly_do_nhap || "Nhập kho mua hàng",
        tongTien,
        ghiChu: body.ghi_chu,
        trangThai: "da_duyet",
        chiTiet,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await adminDb.collection("warehouse_phieu_nhap").doc(soCt).create(candidate);
        phieu = candidate;
        break;
      } catch (e: unknown) {
        if ((e as { code?: number })?.code === 6 && attempt < 2) continue; // trùng số chứng từ, thử lại
        throw new ApiError(500, `Lỗi tạo phiếu nhập: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!phieu) throw new ApiError(500, "Lỗi tạo phiếu nhập: không sinh được số chứng từ duy nhất");

    if (chiTiet.length && body.kho_id) {
      try {
        await postDocumentMovements({
          chiTiet,
          refType: "nhap_kho",
          refId: soCt,
          khoId: body.kho_id,
          direction: 1,
          transactionType: "IMPORT",
          userId: user.id,
        });
      } catch (e) {
        await adminDb.collection("warehouse_phieu_nhap").doc(soCt).delete();
        throw new ApiError(500, `Lỗi cập nhật tồn kho: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await writeAudit({
      action: "CREATE",
      entityType: "phieu_nhap",
      entityId: soCt,
      entityNumber: soCt,
      userId: user.id,
      userEmail: user.email,
      newValues: phieu,
    });

    return NextResponse.json({ message: "Tạo phiếu nhập thành công", id: soCt, so_chung_tu: soCt });
  } catch (e) {
    return handleApiError(e);
  }
}
