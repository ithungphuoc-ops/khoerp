import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";
import type { AppUser, Role } from "@/lib/types/system";

export async function GET() {
  try {
    const user = await requireUser();
    requireManager(user);

    const snap = await adminDb
      .collection("users")
      .where("active", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const roleIds = [...new Set(snap.docs.map((d) => (d.data() as AppUser).roleId).filter(Boolean))] as string[];
    const roleDocs = await Promise.all(roleIds.map((id) => adminDb.collection("roles").doc(id).get()));
    const roleMap = new Map(roleDocs.filter((r) => r.exists).map((r) => [r.id, r.data() as Role]));

    const users = snap.docs.map((d) => {
      const u = d.data() as AppUser;
      const role = u.roleId ? roleMap.get(u.roleId) : undefined;
      return {
        id: d.id,
        email: u.email,
        hoTen: u.hoTen,
        chucVu: u.chucVu,
        phongBan: u.phongBan,
        active: u.active,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        role: role ? { tenRole: role.tenRole, color: role.color } : null,
      };
    });

    return NextResponse.json({ users });
  } catch (e) {
    return handleApiError(e);
  }
}
