import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin, requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";

const UPDATE_FIELDS: Record<string, string> = {
  ten: "ten",
  dia_chi: "diaChi",
  ma_so_thue: "maSoThue",
  nguoi_lien_he: "nguoiLienHe",
  sdt: "sdt",
  email: "email",
  so_tai_khoan_ngan_hang: "soTaiKhoanNganHang",
  so_ngay_duoc_no: "soNgayDuocNo",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id } = await params;
    const snap = await adminDb.collection("purchasing_ncc").doc(id).get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy nhà cung cấp");
    return NextResponse.json(snap.data());
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user, "Không có quyền sửa nhà cung cấp");
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    for (const [snake, camel] of Object.entries(UPDATE_FIELDS)) {
      if (body[snake] !== undefined) data[camel] = body[snake];
    }

    const ref = adminDb.collection("purchasing_ncc").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy nhà cung cấp");

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
    if (!isAdmin(user)) throw new ApiError(403, "Chỉ ADMIN mới được xóa nhà cung cấp");
    const { id } = await params;

    await adminDb.collection("purchasing_ncc").doc(id).set({ active: false }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
