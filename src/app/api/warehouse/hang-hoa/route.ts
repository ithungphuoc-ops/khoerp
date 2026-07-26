import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { HangHoa } from "@/lib/types/warehouse";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;
    const nhomHang = sp.get("nhom_hang") || null;
    const activeParam = sp.get("active");
    const active = activeParam === null ? null : activeParam === "true";
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit") || 50)));

    const snap = await adminDb.collection("warehouse_hang_hoa").orderBy("maHang").get();
    let rows = snap.docs.map((d) => d.data() as HangHoa);

    if (nhomHang) rows = rows.filter((h) => h.nhomHang === nhomHang);
    if (active !== null) rows = rows.filter((h) => h.active === active);
    if (search) {
      rows = rows.filter(
        (h) => h.maHang.toLowerCase().includes(search) || h.tenHang.toLowerCase().includes(search)
      );
    }

    const total = rows.length;
    const offset = (page - 1) * limit;
    const items = rows.slice(offset, offset + limit);

    return NextResponse.json({ items, total, page, limit });
  } catch (e) {
    return handleApiError(e);
  }
}

interface HangHoaCreateBody {
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
    if (!body.ma_hang || !body.ten_hang) throw new ApiError(400, "Thiếu mã hàng hoặc tên hàng");

    const now = new Date().toISOString();
    const data: HangHoa = {
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

    try {
      await adminDb.collection("warehouse_hang_hoa").doc(body.ma_hang).create(data);
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 6) throw new ApiError(400, `Mã hàng "${body.ma_hang}" đã tồn tại`);
      throw new ApiError(400, `Lỗi tạo hàng hóa: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json({ message: "Tạo hàng hóa thành công", id: body.ma_hang });
  } catch (e) {
    return handleApiError(e);
  }
}
