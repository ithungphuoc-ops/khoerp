import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import { getKhoDisplay } from "@/lib/server/khoLookup";
import type { HangHoa, TonKho } from "@/lib/types/warehouse";

function hangHoaDocId(khoId: string, maHang: string): string {
  return `${khoId}_${maHang}`;
}

/** Đọc tồn kho hiện tại (point-read, nhanh) cho danh sách hàng hóa — mỗi item đã có khoId riêng. */
async function attachTonKho<T extends { khoId: string; maHang: string }>(items: T[]): Promise<(T & { tonKho: number })[]> {
  const snaps = await Promise.all(items.map((h) => adminDb.collection("warehouse_ton_kho").doc(`${h.khoId}_${h.maHang}`).get()));
  return items.map((h, i) => ({ ...h, tonKho: snaps[i].exists ? (snaps[i].data() as TonKho).soLuong ?? 0 : 0 }));
}

/** Gắn thông tin hiển thị kho (tenKho) cho danh sách hàng hóa — dùng khi xem "Tất cả kho". */
async function attachKhoDisplay<T extends { khoId: string }>(items: T[]) {
  const khoIds = [...new Set(items.map((h) => h.khoId))];
  const khoDisplays = await Promise.all(khoIds.map(async (id) => [id, await getKhoDisplay(id)] as const));
  const khoMap = new Map(khoDisplays);
  return items.map((h) => ({ ...h, kho: khoMap.get(h.khoId) ?? null }));
}

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;
    const maHangExact = sp.get("ma_hang") || null;
    const nhomHang = sp.get("nhom_hang") || null;
    const khoId = sp.get("kho_id") || null;
    const activeParam = sp.get("active");
    const active = activeParam === null ? null : activeParam === "true";
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit") || 50)));

    // Tra chính xác 1 mã hàng trong 1 kho cụ thể (dùng để refresh tồn kho khi
    // người dùng đổi kho sau khi đã chọn hàng — cần đúng chính xác 1 kết quả).
    if (maHangExact) {
      if (!khoId) return NextResponse.json({ items: [], total: 0, page: 1, limit: 1 });
      const snap = await adminDb.collection("warehouse_hang_hoa").doc(hangHoaDocId(khoId, maHangExact)).get();
      if (!snap.exists) return NextResponse.json({ items: [], total: 0, page: 1, limit: 1 });
      const hh = { id: snap.id, ...(snap.data() as HangHoa) };
      const items = await attachTonKho([hh]);
      return NextResponse.json({ items, total: 1, page: 1, limit: 1 });
    }

    const snap = await adminDb.collection("warehouse_hang_hoa").orderBy("maHang").get();
    let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as HangHoa) }));

    // Mỗi kho có danh mục hàng hóa độc lập — có kho_id thì chỉ lấy đúng danh
    // mục của kho đó, không có (xem "Tất cả kho") thì gộp hết.
    if (khoId) rows = rows.filter((h) => h.khoId === khoId);
    if (nhomHang) rows = rows.filter((h) => h.nhomHang === nhomHang);
    if (active !== null) rows = rows.filter((h) => h.active === active);
    if (search) {
      rows = rows.filter(
        (h) => h.maHang.toLowerCase().includes(search) || h.tenHang.toLowerCase().includes(search)
      );
    }

    const total = rows.length;
    const offset = (page - 1) * limit;
    const pageRows = rows.slice(offset, offset + limit);
    let items: unknown[] = await attachTonKho(pageRows);
    if (!khoId) items = await attachKhoDisplay(items as (HangHoa & { tonKho: number })[]);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    return handleApiError(e);
  }
}

interface HangHoaCreateBody {
  kho_id: string;
  ma_hang: string;
  ten_hang: string;
  don_vi_tinh?: string;
  nhom_hang?: string;
  gia_nhap?: number;
  gia_ban?: number;
  mo_ta?: string;
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = (await req.json()) as HangHoaCreateBody;
    if (!body.kho_id) throw new ApiError(400, "Thiếu kho — mỗi hàng hóa phải thuộc về 1 kho cụ thể");
    if (!body.ma_hang || !body.ten_hang) throw new ApiError(400, "Thiếu mã hàng hoặc tên hàng");

    const now = new Date().toISOString();
    const data: HangHoa = {
      khoId: body.kho_id,
      maHang: body.ma_hang,
      tenHang: body.ten_hang,
      donViTinh: body.don_vi_tinh,
      nhomHang: body.nhom_hang,
      giaNhap: body.gia_nhap ?? 0,
      giaBan: body.gia_ban ?? 0,
      moTa: body.mo_ta,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    const id = hangHoaDocId(body.kho_id, body.ma_hang);
    try {
      await adminDb.collection("warehouse_hang_hoa").doc(id).create(data);
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 6) throw new ApiError(400, `Mã hàng "${body.ma_hang}" đã tồn tại ở kho này`);
      throw new ApiError(400, `Lỗi tạo hàng hóa: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json({ message: "Tạo hàng hóa thành công", id });
  } catch (e) {
    return handleApiError(e);
  }
}
