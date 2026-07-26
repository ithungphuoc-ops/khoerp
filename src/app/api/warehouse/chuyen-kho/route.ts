import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { generateSoChungTu } from "@/lib/server/soChungTu";
import { postTransferMovements, writeAudit, checkStock, resolveHangHoaId } from "@/lib/server/warehouseEngine";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { PhieuChuyenKho, ChiTietPhieu, LoaiChuyenKho } from "@/lib/types/warehouse";

/**
 * Warehouse — Phiếu Chuyển Kho. Số chứng từ: CK-YYYY-00001.
 * Mỗi phiếu sinh 2 luồng TRANSFER_OUT/TRANSFER_IN, cả 2 kho cập nhật trong
 * CÙNG 1 Firestore transaction (postTransferMovements) — không thể có
 * trường hợp kho A giảm mà kho B không tăng.
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

interface PhieuChuyenCreateBody {
  ngay_hach_toan: string;
  ngay_chung_tu: string;
  kho_xuat_id?: string;
  kho_nhap_id?: string;
  loai_chuyen?: LoaiChuyenKho;
  nguoi_chuyen?: string;
  ly_do_chuyen?: string;
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

async function checkStockForTransfer(khoXuatId: string | undefined, chiTiet: ChiTietPhieu[]) {
  if (!khoXuatId) return;
  const insufficient: string[] = [];
  for (const ct of chiTiet) {
    const hangHoaId = await resolveHangHoaId(ct);
    if (!hangHoaId || ct.soLuong <= 0) continue;
    const ton = await checkStock(khoXuatId, hangHoaId);
    if (ton < ct.soLuong) {
      insufficient.push(`${ct.tenHang || ct.maHang}: cần ${ct.soLuong}, tồn ${ton}`);
    }
  }
  if (insufficient.length) {
    throw new ApiError(400, `Không đủ tồn kho để chuyển: ${insufficient.join("; ")}`);
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

    const snap = await adminDb.collection("warehouse_phieu_chuyen").orderBy("ngayHachToan", "desc").get();
    let rows = snap.docs.map((d) => d.data() as PhieuChuyenKho).filter((p) => !p.deletedAt);

    if (khoId) rows = rows.filter((p) => p.khoXuatId === khoId || p.khoNhapId === khoId);
    if (tuNgay) rows = rows.filter((p) => p.ngayHachToan >= tuNgay);
    if (denNgay) rows = rows.filter((p) => p.ngayHachToan <= denNgay);
    if (search) {
      rows = rows.filter(
        (p) =>
          p.soChungTu.toLowerCase().includes(search) ||
          (p.tenNguoiVc || "").toLowerCase().includes(search)
      );
    }

    const total = rows.length;
    const offset = (page - 1) * limit;
    const pageRows = rows.slice(offset, offset + limit);

    const khoCache = new Map<string, { maKho: string; tenKho: string } | null>();
    const getKho = async (id?: string) => {
      if (!id) return null;
      if (!khoCache.has(id)) khoCache.set(id, await getKhoDisplay(id));
      return khoCache.get(id) ?? null;
    };

    const items = await Promise.all(
      pageRows.map(async (p) => {
        const { chiTiet: _chiTiet, ...rest } = p;
        void _chiTiet;
        return {
          ...rest,
          kho_xuat: await getKho(p.khoXuatId),
          kho_nhap: await getKho(p.khoNhapId),
        };
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
    const body = (await req.json()) as PhieuChuyenCreateBody;

    if (body.kho_xuat_id && body.kho_nhap_id && body.kho_xuat_id === body.kho_nhap_id) {
      throw new ApiError(400, "Kho xuất và kho nhập không được trùng nhau");
    }

    const chiTietBody = body.chi_tiet || [];
    const chiTiet = chiTietBody.map((ct, i) => toChiTietPhieu(ct, i + 1));

    if (chiTiet.length && body.kho_xuat_id) {
      await checkStockForTransfer(body.kho_xuat_id, chiTiet);
    }

    const now = new Date().toISOString();

    let soCt = "";
    let phieu: PhieuChuyenKho | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      soCt = await generateSoChungTu("warehouse_phieu_chuyen", "CK");
      const candidate: PhieuChuyenKho = {
        soChungTu: soCt,
        loaiChuyen: body.loai_chuyen || "noi_bo",
        ngayHachToan: body.ngay_hach_toan,
        ngayChungTu: body.ngay_chung_tu,
        khoXuatId: body.kho_xuat_id,
        khoNhapId: body.kho_nhap_id,
        nguoiChuyen: body.nguoi_chuyen,
        lyDoChuyen: body.ly_do_chuyen || "Chuyển kho nội bộ",
        tongSoLuong: chiTiet.reduce((sum, ct) => sum + ct.soLuong, 0),
        trangThai: "da_duyet",
        ghiChu: body.ghi_chu,
        chiTiet,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await adminDb.collection("warehouse_phieu_chuyen").doc(soCt).create(candidate);
        phieu = candidate;
        break;
      } catch (e: unknown) {
        if ((e as { code?: number })?.code === 6 && attempt < 2) continue;
        throw new ApiError(500, `Lỗi tạo phiếu chuyển: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!phieu) throw new ApiError(500, "Lỗi tạo phiếu chuyển: không sinh được số chứng từ duy nhất");

    if (chiTiet.length && body.kho_xuat_id && body.kho_nhap_id) {
      try {
        await postTransferMovements({
          chiTiet,
          refId: soCt,
          khoXuatId: body.kho_xuat_id,
          khoNhapId: body.kho_nhap_id,
          userId: user.id,
        });
      } catch (e) {
        await adminDb.collection("warehouse_phieu_chuyen").doc(soCt).delete();
        throw new ApiError(500, `Lỗi cập nhật tồn kho: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await writeAudit({
      action: "CREATE",
      entityType: "phieu_chuyen",
      entityId: soCt,
      entityNumber: soCt,
      userId: user.id,
      userEmail: user.email,
      newValues: phieu,
    });

    return NextResponse.json({ message: "Tạo phiếu chuyển kho thành công", id: soCt, so_chung_tu: soCt });
  } catch (e) {
    return handleApiError(e);
  }
}
