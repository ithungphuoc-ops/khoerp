import { NextRequest, NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { HangHoaMuaHang, TinhChatHangHoaMuaHang } from "@/lib/types/purchasing";

const TINH_CHAT_HOP_LE = new Set<TinhChatHangHoaMuaHang>(["hang_hoa", "dich_vu", "nguyen_vat_lieu", "cong_cu_dung_cu"]);

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;

    const snap = await adminDb
      .collection("purchasing_hang_hoa")
      .where("active", "==", true)
      .orderBy(FieldPath.documentId())
      .get();
    let items = snap.docs.map((d) => d.data() as HangHoaMuaHang);

    if (search) {
      items = items.filter((h) => h.ma.toLowerCase().includes(search) || h.ten.toLowerCase().includes(search));
    }

    return NextResponse.json({ items });
  } catch (e) {
    return handleApiError(e);
  }
}

interface HangHoaCreateBody {
  ma: string;
  ten: string;
  don_vi_tinh?: string;
  tinh_chat: TinhChatHangHoaMuaHang;
  mo_ta?: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền tạo hàng hóa/dịch vụ mua hàng");
    const body = (await req.json()) as HangHoaCreateBody;
    if (!body.ma || !body.ten) throw new ApiError(400, "Thiếu mã hoặc tên hàng hóa/dịch vụ");
    if (!body.tinh_chat || !TINH_CHAT_HOP_LE.has(body.tinh_chat)) throw new ApiError(400, "Tính chất hàng hóa/dịch vụ không hợp lệ");

    const data: HangHoaMuaHang = {
      ma: body.ma,
      ten: body.ten,
      donViTinh: body.don_vi_tinh,
      tinhChat: body.tinh_chat,
      moTa: body.mo_ta,
      active: true,
      createdAt: new Date().toISOString(),
    };

    try {
      await adminDb.collection("purchasing_hang_hoa").doc(body.ma).create(data);
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 6) throw new ApiError(400, `Mã hàng "${body.ma}" đã tồn tại`);
      throw new ApiError(400, `Lỗi tạo hàng hóa/dịch vụ: ${e instanceof Error ? e.message : String(e)}`);
    }

    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}
