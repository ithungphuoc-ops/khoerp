import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { isAdmin } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";
import type { Permission } from "@/lib/types/system";

interface PermFlags {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/** Trả về map permissions đầy đủ (theo module_code) của user hiện tại. */
export async function GET() {
  try {
    const user = await requireUser();
    const permissions: Record<string, PermFlags> = {};

    if (isAdmin(user)) {
      const modsSnap = await adminDb.collection("modules").get();
      for (const doc of modsSnap.docs) {
        permissions[doc.id] = { canView: true, canCreate: true, canEdit: true, canDelete: true };
      }
      return NextResponse.json({ permissions });
    }

    if (!user.roleId) {
      return NextResponse.json({ permissions: {} });
    }

    const permsSnap = await adminDb
      .collection("roles")
      .doc(user.roleId)
      .collection("permissions")
      .get();
    for (const doc of permsSnap.docs) {
      const p = doc.data() as Permission;
      permissions[doc.id] = {
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
      };
    }
    return NextResponse.json({ permissions });
  } catch (e) {
    return handleApiError(e);
  }
}
