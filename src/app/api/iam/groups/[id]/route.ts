import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin, requireManager } from "@/lib/server/permissions";
import { handleApiError, ApiError } from "@/lib/server/apiError";
import type { Group, AppUser, Role } from "@/lib/types/system";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user);
    const { id } = await params;

    const snap = await adminDb.collection("groups").doc(id).get();
    if (!snap.exists) throw new ApiError(404, "Không tìm thấy nhóm");
    const group = snap.data() as Group;

    const memberDocs = await Promise.all(
      (group.memberIds || []).map((uid) => adminDb.collection("users").doc(uid).get())
    );
    const roleIds = [
      ...new Set(memberDocs.filter((d) => d.exists).map((d) => (d.data() as AppUser).roleId).filter(Boolean)),
    ] as string[];
    const roleDocs = await Promise.all(roleIds.map((rid) => adminDb.collection("roles").doc(rid).get()));
    const roleMap = new Map(roleDocs.filter((r) => r.exists).map((r) => [r.id, r.data() as Role]));

    const members = memberDocs
      .filter((d) => d.exists)
      .map((d) => {
        const u = d.data() as AppUser;
        const role = u.roleId ? roleMap.get(u.roleId) : undefined;
        return {
          id: d.id,
          email: u.email,
          hoTen: u.hoTen,
          avatarUrl: u.avatarUrl,
          roles: role ? { tenRole: role.tenRole, color: role.color } : null,
        };
      });

    return NextResponse.json({ id, ...group, members });
  } catch (e) {
    return handleApiError(e);
  }
}

const UPDATE_FIELDS = ["tenNhom", "moTa", "color", "active"] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user);
    const { id } = await params;
    const body = await req.json();

    const raw: Record<string, unknown> = {
      tenNhom: body.ten_nhom ?? body.tenNhom,
      moTa: body.mo_ta ?? body.moTa,
      color: body.color,
      active: body.active,
    };
    const data: Record<string, unknown> = {};
    for (const field of UPDATE_FIELDS) {
      if (raw[field] !== undefined && raw[field] !== null) data[field] = raw[field];
    }
    if (Object.keys(data).length === 0) throw new ApiError(400, "Không có dữ liệu cập nhật");
    data.updatedAt = new Date().toISOString();

    await adminDb.collection("groups").doc(id).set(data, { merge: true });
    return NextResponse.json({ message: "Đã cập nhật nhóm" });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!isAdmin(user)) throw new ApiError(403, "Chỉ ADMIN mới được xóa nhóm");
    const { id } = await params;

    await adminDb.collection("groups").doc(id).delete();
    return NextResponse.json({ message: "Đã xóa nhóm" });
  } catch (e) {
    return handleApiError(e);
  }
}
