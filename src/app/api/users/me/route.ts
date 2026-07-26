import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/apiError";

const EDITABLE_FIELDS = ["hoTen", "chucVu", "phongBan", "soDienThoai", "avatarUrl"] as const;

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json(user);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const data: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined && body[field] !== null) data[field] = body[field];
    }
    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "Không có dữ liệu cập nhật");
    }
    data.updatedAt = new Date().toISOString();

    await adminDb.collection("users").doc(user.id).set(data, { merge: true });
    return NextResponse.json({ message: "Cập nhật thành công" });
  } catch (e) {
    return handleApiError(e);
  }
}
