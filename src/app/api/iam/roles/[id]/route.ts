import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireAdmin } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { Role } from "@/lib/types/system";

const UPDATE_FIELDS = ["tenRole", "moTa", "color", "active"] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireAdmin(user, "Chỉ ADMIN mới được quản lý vai trò");
    const { id } = await params;
    const body = await req.json();

    // body dùng tên field kiểu Python (ten_role...) từ client cũ port sang — map cả 2 kiểu
    // để tương thích nếu client gửi camelCase hoặc snake_case.
    const raw: Record<string, unknown> = {
      tenRole: body.ten_role ?? body.tenRole,
      moTa: body.mo_ta ?? body.moTa,
      color: body.color,
      active: body.active,
    };
    const data: Record<string, unknown> = {};
    for (const field of UPDATE_FIELDS) {
      if (raw[field] !== undefined && raw[field] !== null) data[field] = raw[field];
    }
    if (Object.keys(data).length === 0) throw new ApiError(400, "Không có dữ liệu cập nhật");

    await adminDb.collection("roles").doc(id).set(data, { merge: true });
    return NextResponse.json({ message: "Đã cập nhật vai trò" });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireAdmin(user, "Chỉ ADMIN mới được quản lý vai trò");
    const { id } = await params;

    const roleSnap = await adminDb.collection("roles").doc(id).get();
    if ((roleSnap.data() as Role | undefined)?.tenRole === "ADMIN") {
      throw new ApiError(400, "Không thể xóa vai trò ADMIN");
    }

    const usersUsingRole = await adminDb.collection("users").where("roleId", "==", id).count().get();
    const count = usersUsingRole.data().count;
    if (count > 0) {
      throw new ApiError(400, `Vai trò đang được dùng bởi ${count} tài khoản`);
    }

    const permsSnap = await adminDb.collection("roles").doc(id).collection("permissions").get();
    const batch = adminDb.batch();
    permsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(adminDb.collection("roles").doc(id));
    await batch.commit();

    return NextResponse.json({ message: "Đã xóa vai trò" });
  } catch (e) {
    return handleApiError(e);
  }
}
