import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";
import type { ActivityLog, AppUser, Role } from "@/lib/types/system";

// Lấy tối đa 1000 log gần nhất rồi lọc/phân trang trong bộ nhớ, thay vì dựng
// nhiều composite index cho mọi tổ hợp filter (user/module/action/khoảng
// ngày) — đơn giản hơn nhiều cho một trang audit log nội bộ. Nếu khối lượng
// log tăng lớn, nên chuyển sang query Firestore trực tiếp theo từng filter.
const SCAN_LIMIT = 1000;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireManager(user);

    const sp = req.nextUrl.searchParams;
    const userId = sp.get("user_id");
    const moduleCode = sp.get("module_code");
    const action = sp.get("action");
    const dateFrom = sp.get("date_from");
    const dateTo = sp.get("date_to");
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit") || 50)));

    const snap = await adminDb.collection("activity_log").orderBy("createdAt", "desc").limit(SCAN_LIMIT).get();
    let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ActivityLog) }));

    if (userId) rows = rows.filter((r) => r.userId === userId);
    if (moduleCode) rows = rows.filter((r) => r.moduleCode === moduleCode);
    if (action) rows = rows.filter((r) => r.action === action);
    if (dateFrom) rows = rows.filter((r) => r.createdAt >= dateFrom);
    if (dateTo) rows = rows.filter((r) => r.createdAt <= `${dateTo}T23:59:59`);

    const total = rows.length;
    const offset = (page - 1) * limit;
    const pageRows = rows.slice(offset, offset + limit);

    const userIds = [...new Set(pageRows.map((r) => r.userId).filter(Boolean))] as string[];
    const userDocs = await Promise.all(userIds.map((uid) => adminDb.collection("users").doc(uid).get()));
    const userMap = new Map(userDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as AppUser]));
    const roleIds = [...new Set([...userMap.values()].map((u) => u.roleId).filter(Boolean))] as string[];
    const roleDocs = await Promise.all(roleIds.map((rid) => adminDb.collection("roles").doc(rid).get()));
    const roleMap = new Map(roleDocs.filter((r) => r.exists).map((r) => [r.id, r.data() as Role]));

    const logs = pageRows.map((r) => {
      const u = r.userId ? userMap.get(r.userId) : undefined;
      const role = u?.roleId ? roleMap.get(u.roleId) : undefined;
      return {
        ...r,
        users: u
          ? {
              hoTen: u.hoTen,
              email: u.email,
              avatarUrl: u.avatarUrl,
              roles: role ? { tenRole: role.tenRole, color: role.color } : null,
            }
          : null,
      };
    });

    return NextResponse.json({ logs, total, page, limit });
  } catch (e) {
    return handleApiError(e);
  }
}
