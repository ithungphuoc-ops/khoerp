import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin, requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { TinhChatHangHoaMuaHang } from "@/lib/types/purchasing";

const TINH_CHAT_HOP_LE = new Set<TinhChatHangHoaMuaHang>(["hang_hoa", "dich_vu", "nguyen_vat_lieu", "cong_cu_dung_cu"]);

const UPDATE_FIELDS: Record<string, string> = {
  ten: "ten",
  don_vi_tinh: "donViTinh",
  tinh_chat: "tinhChat",
  mo_ta: "moTa",
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền sửa hàng hóa/dịch vụ mua hàng");
    const { id } = await params;
    const body = await req.json();

    if (body.tinh_chat !== undefined && !TINH_CHAT_HOP_LE.has(body.tinh_chat)) {
      throw new ApiError(400, "Tính chất hàng hóa/dịch vụ không hợp lệ");
    }

    const data: Record<string, unknown> = {};
    for (const [snake, camel] of Object.entries(UPDATE_FIELDS)) {
      if (body[snake] !== undefined) data[camel] = body[snake];
    }

    const ref = adminDb.collection("purchasing_hang_hoa").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy hàng hóa/dịch vụ");

    await ref.set(data, { merge: true });
    const updated = await ref.get();
    return NextResponse.json(updated.data());
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!isAdmin(user)) throw new ApiError(403, "Chỉ ADMIN mới được xóa hàng hóa/dịch vụ mua hàng");
    const { id } = await params;

    await adminDb.collection("purchasing_hang_hoa").doc(id).set({ active: false }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
