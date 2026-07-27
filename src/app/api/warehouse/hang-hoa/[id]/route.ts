import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const snap = await adminDb.collection("warehouse_hang_hoa").doc(id).get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy hàng hóa");
    return NextResponse.json({ id: snap.id, ...snap.data() });
  } catch (e) {
    return handleApiError(e);
  }
}

const UPDATE_FIELDS: Record<string, string> = {
  ten_hang: "tenHang",
  don_vi_tinh: "donViTinh",
  nhom_hang: "nhomHang",
  gia_nhap: "giaNhap",
  gia_ban: "giaBan",
  mo_ta: "moTa",
  active: "active",
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    for (const [snake, camel] of Object.entries(UPDATE_FIELDS)) {
      if (body[snake] !== undefined && body[snake] !== null) data[camel] = body[snake];
    }
    if (Object.keys(data).length === 0) throw new ApiError(400, "Không có dữ liệu cập nhật");
    data.updatedAt = new Date().toISOString();

    await adminDb.collection("warehouse_hang_hoa").doc(id).set(data, { merge: true });
    return NextResponse.json({ message: "Cập nhật thành công" });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!isAdmin(user)) throw new ApiError(403, "Chỉ ADMIN mới được xóa");
    const { id } = await params;

    await adminDb.collection("warehouse_hang_hoa").doc(id).set({ active: false }, { merge: true });
    return NextResponse.json({ message: "Đã ẩn hàng hóa" });
  } catch (e) {
    return handleApiError(e);
  }
}
