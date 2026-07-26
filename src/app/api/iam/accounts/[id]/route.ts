import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin, requireManager } from "@/lib/server/permissions";
import { logActivity } from "@/lib/server/activityLog";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { AppUser, Role, ActivityLog } from "@/lib/types/system";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireUser();
    requireManager(currentUser);
    const { id } = await params;

    const snap = await adminDb.collection("users").doc(id).get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy tài khoản");
    const data = snap.data() as AppUser;

    let roles: { id: string; tenRole: string; color: string } | null = null;
    if (data.roleId) {
      const roleSnap = await adminDb.collection("roles").doc(data.roleId).get();
      if (roleSnap.exists) {
        const r = roleSnap.data() as Role;
        roles = { id: data.roleId, tenRole: r.tenRole, color: r.color };
      }
    }

    const groupsSnap = await adminDb.collection("groups").where("memberIds", "array-contains", id).get();
    const groups = groupsSnap.docs.map((d) => ({ id: d.id, tenNhom: d.data().tenNhom, color: d.data().color }));

    const activitySnap = await adminDb
      .collection("activity_log")
      .where("userId", "==", id)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    const activity = activitySnap.docs.map((d) => d.data() as ActivityLog);

    return NextResponse.json({ id, ...data, roles, groups, activity });
  } catch (e) {
    return handleApiError(e);
  }
}

const UPDATE_FIELDS = [
  "hoTen",
  "username",
  "soDienThoai",
  "phongBan",
  "chucVu",
  "ngaySinh",
  "gioiTinh",
  "moTa",
  "avatarUrl",
] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireUser();
    requireManager(currentUser);
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    for (const field of UPDATE_FIELDS) {
      if (body[field] !== undefined && body[field] !== null) data[field] = body[field];
    }
    if (Object.keys(data).length === 0) throw new ApiError(400, "Không có dữ liệu cập nhật");
    data.updatedAt = new Date().toISOString();

    await adminDb.collection("users").doc(id).set(data, { merge: true });
    await logActivity({
      actorId: currentUser.id,
      moduleCode: "iam_accounts",
      action: "UPDATE_USER",
      entity: "users",
      entityId: id,
      moTa: `Cập nhật thông tin: ${Object.keys(data).join(", ")}`,
    });

    return NextResponse.json({ message: "Cập nhật thành công" });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await requireUser();
    if (!isAdmin(currentUser)) throw new ApiError(403, "Chỉ ADMIN mới được xóa tài khoản");
    const { id } = await params;
    if (id === currentUser.id) throw new ApiError(400, "Không thể xóa chính mình");

    const snap = await adminDb.collection("users").doc(id).get();
    const email = (snap.data() as AppUser | undefined)?.email || id;

    await logActivity({
      actorId: currentUser.id,
      moduleCode: "iam_accounts",
      action: "DELETE_USER",
      entity: "users",
      entityId: id,
      moTa: `Xóa tài khoản ${email}`,
    });

    try {
      await adminAuth.deleteUser(id);
    } catch (e) {
      throw new ApiError(500, `Lỗi xóa tài khoản: ${e instanceof Error ? e.message : String(e)}`);
    }
    await adminDb.collection("users").doc(id).delete();

    return NextResponse.json({ message: "Đã xóa tài khoản" });
  } catch (e) {
    return handleApiError(e);
  }
}
