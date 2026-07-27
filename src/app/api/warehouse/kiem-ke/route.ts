import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { generateSoChungTu } from "@/lib/server/soChungTu";
import { postInventoryAdjustment, writeAudit } from "@/lib/server/warehouseEngine";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { PhieuKiemKe, ChiTietKiemKe } from "@/lib/types/warehouse";

interface ChiTietCreateBody {
  hang_hoa_id: string;
  ma_hang: string;
  ten_hang: string;
  don_vi_tinh?: string;
  so_luong_he_thong: number;
  so_luong_thuc_te: number;
  ghi_chu?: string;
}

interface PhieuKiemKeCreateBody {
  ngay_kiem_ke: string;
  kho_id: string;
  nguoi_kiem_ke?: string;
  ly_do?: string;
  ghi_chu?: string;
  chi_tiet?: ChiTietCreateBody[];
}

function toChiTietKiemKe(ct: ChiTietCreateBody, stt: number): ChiTietKiemKe {
  const heThong = Number(ct.so_luong_he_thong) || 0;
  const thucTe = Number(ct.so_luong_thuc_te) || 0;
  return {
    stt,
    hangHoaId: ct.hang_hoa_id,
    maHang: ct.ma_hang,
    tenHang: ct.ten_hang,
    donViTinh: ct.don_vi_tinh,
    soLuongHeThong: heThong,
    soLuongThucTe: thucTe,
    chenhLech: thucTe - heThong,
    ghiChu: ct.ghi_chu,
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;
    const khoId = sp.get("kho_id") || null;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));

    const snap = await adminDb.collection("warehouse_phieu_kiem_ke").orderBy("ngayKiemKe", "desc").get();
    let rows = snap.docs.map((d) => d.data() as PhieuKiemKe).filter((p) => !p.deletedAt);

    if (khoId) rows = rows.filter((p) => p.khoId === khoId);
    if (search) {
      rows = rows.filter((p) => p.soChungTu.toLowerCase().includes(search) || (p.lyDo || "").toLowerCase().includes(search));
    }

    const total = rows.length;
    const offset = (page - 1) * limit;
    const pageRows = rows.slice(offset, offset + limit);

    const khoCache = new Map<string, { maKho: string; tenKho: string } | null>();
    const items = await Promise.all(
      pageRows.map(async (p) => {
        if (p.khoId && !khoCache.has(p.khoId)) khoCache.set(p.khoId, await getKhoDisplay(p.khoId));
        const soDongChenhLech = p.chiTiet.filter((ct) => ct.chenhLech !== 0).length;
        const { chiTiet: _chiTiet, ...rest } = p;
        void _chiTiet;
        return { ...rest, kho: p.khoId ? khoCache.get(p.khoId) : null, soDongChenhLech };
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
    requireManager(user, "Không có quyền lập phiếu kiểm kê");
    const body = (await req.json()) as PhieuKiemKeCreateBody;
    if (!body.kho_id) throw new ApiError(400, "Vui lòng chọn kho kiểm kê");

    const chiTietBody = body.chi_tiet || [];
    const chiTiet = chiTietBody.map((ct, i) => toChiTietKiemKe(ct, i + 1));
    const now = new Date().toISOString();

    let soCt = "";
    let phieu: PhieuKiemKe | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      soCt = await generateSoChungTu("warehouse_phieu_kiem_ke", "KK");
      const candidate: PhieuKiemKe = {
        soChungTu: soCt,
        ngayKiemKe: body.ngay_kiem_ke,
        khoId: body.kho_id,
        nguoiKiemKe: body.nguoi_kiem_ke,
        lyDo: body.ly_do,
        ghiChu: body.ghi_chu,
        trangThai: "da_duyet",
        chiTiet,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await adminDb.collection("warehouse_phieu_kiem_ke").doc(soCt).create(candidate);
        phieu = candidate;
        break;
      } catch (e: unknown) {
        if ((e as { code?: number })?.code === 6 && attempt < 2) continue;
        throw new ApiError(500, `Lỗi tạo phiếu kiểm kê: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (!phieu) throw new ApiError(500, "Lỗi tạo phiếu kiểm kê: không sinh được số chứng từ duy nhất");

    if (chiTiet.length) {
      try {
        await postInventoryAdjustment({
          khoId: body.kho_id,
          items: chiTiet.map((ct) => ({ hangHoaId: ct.hangHoaId, soLuongThucTe: ct.soLuongThucTe })),
          refId: soCt,
          userId: user.id,
        });
      } catch (e) {
        await adminDb.collection("warehouse_phieu_kiem_ke").doc(soCt).delete();
        throw new ApiError(500, `Lỗi điều chỉnh tồn kho: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    await writeAudit({
      action: "ADJUST",
      entityType: "phieu_kiem_ke",
      entityId: soCt,
      entityNumber: soCt,
      userId: user.id,
      userEmail: user.email,
      newValues: phieu,
    });

    return NextResponse.json({ message: "Tạo phiếu kiểm kê thành công", id: soCt, so_chung_tu: soCt });
  } catch (e) {
    return handleApiError(e);
  }
}
