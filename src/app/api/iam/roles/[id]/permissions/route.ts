import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireAdmin, requireManager } from "@/lib/server/permissions";
import { logActivity } from "@/lib/server/activityLog";
import { handleApiError } from "@/lib/server/apiError";
import type { Module, Permission } from "@/lib/types/system";

const FLAG_FIELDS = [
  "canView",
  "canCreate",
  "canEdit",
  "canDelete",
  "canApprove",
  "canImport",
  "canExport",
  "canAi",
  "canReport",
] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireManager(user);
    const { id } = await params;

    const [modsSnap, permsSnap] = await Promise.all([
      adminDb.collection("modules").where("active", "==", true).orderBy("thuTu").get(),
      adminDb.collection("roles").doc(id).collection("permissions").get(),
    ]);
    const permMap = new Map(permsSnap.docs.map((d) => [d.id, d.data() as Permission]));

    const permissions = modsSnap.docs.map((d) => {
      const m = d.data() as Module;
      const p = permMap.get(m.code);
      const flags: Record<string, boolean> = {};
      for (const f of FLAG_FIELDS) flags[f] = p?.[f] ?? false;
      return {
        module_code: m.code,
        ten: m.ten,
        icon: m.icon,
        parent_code: m.parentCode,
        ...flags,
      };
    });

    return NextResponse.json({ permissions });
  } catch (e) {
    return handleApiError(e);
  }
}

interface PermissionUpdateBody {
  module_code: string;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_approve?: boolean;
  can_import?: boolean;
  can_export?: boolean;
  can_ai?: boolean;
  can_report?: boolean;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    requireAdmin(user, "Chỉ ADMIN mới được quản lý vai trò");
    const { id } = await params;
    const updates = (await req.json()) as PermissionUpdateBody[];

    const batch = adminDb.batch();
    for (const p of updates) {
      const ref = adminDb.collection("roles").doc(id).collection("permissions").doc(p.module_code);
      batch.set(
        ref,
        {
          moduleCode: p.module_code,
          canView: p.can_view ?? false,
          canCreate: p.can_create ?? false,
          canEdit: p.can_edit ?? false,
          canDelete: p.can_delete ?? false,
          canApprove: p.can_approve ?? false,
          canImport: p.can_import ?? false,
          canExport: p.can_export ?? false,
          canAi: p.can_ai ?? false,
          canReport: p.can_report ?? false,
        },
        { merge: true }
      );
    }
    await batch.commit();

    await logActivity({
      actorId: user.id,
      moduleCode: "iam_roles",
      action: "UPDATE_PERMISSIONS",
      entity: "roles",
      entityId: id,
      moTa: `Cập nhật ${updates.length} quyền`,
    });

    return NextResponse.json({ message: "Đã lưu phân quyền" });
  } catch (e) {
    return handleApiError(e);
  }
}
