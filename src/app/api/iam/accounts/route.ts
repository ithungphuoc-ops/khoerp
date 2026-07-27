import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/server/auth";
import { requireManager } from "@/lib/server/permissions";
import { handleApiError } from "@/lib/server/apiError";
import type { AppUser, Role } from "@/lib/types/system";

/**
 * Chỉ còn GET (danh sách) — tạo/sửa/khóa tài khoản đã chuyển hẳn sang giao
 * diện quản trị của HPCore (account.hpcore.vn). Endpoint này vẫn cần cho
 * trang Nhóm (chọn thành viên) và bộ chọn tài khoản dùng chung trong IAM.
 *
 * Firestore không có ILIKE/OR full-text search như Postgres. Với quy mô tài
 * khoản nội bộ một công ty (vài chục–vài trăm), fetch toàn bộ rồi lọc/phân
 * trang trong bộ nhớ là đủ nhanh và đơn giản hơn nhiều so với dựng search
 * index riêng (Algolia/Typesense). Nếu sau này số tài khoản lên tới hàng
 * nghìn, cân nhắc lại cách này.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    requireManager(user);

    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.toLowerCase().trim() || null;
    const roleId = sp.get("role_id") || null;
    const activeParam = sp.get("active");
    const active = activeParam === null ? null : activeParam === "true";
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit") || 20)));

    const snap = await adminDb.collection("users").orderBy("createdAt", "desc").get();
    let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AppUser) }));

    if (roleId) rows = rows.filter((u) => u.roleId === roleId);
    if (active !== null) rows = rows.filter((u) => u.active === active);
    if (search) {
      rows = rows.filter(
        (u) =>
          (u.hoTen || "").toLowerCase().includes(search) ||
          (u.email || "").toLowerCase().includes(search) ||
          (u.username || "").toLowerCase().includes(search)
      );
    }

    const total = rows.length;
    const offset = (page - 1) * limit;
    const pageRows = rows.slice(offset, offset + limit);

    const roleIds = [...new Set(pageRows.map((u) => u.roleId).filter(Boolean))] as string[];
    const roleDocs = await Promise.all(roleIds.map((id) => adminDb.collection("roles").doc(id).get()));
    const roleMap = new Map(roleDocs.filter((r) => r.exists).map((r) => [r.id, r.data() as Role]));

    const accounts = pageRows.map((u) => ({
      id: u.id,
      email: u.email,
      hoTen: u.hoTen,
      username: u.username,
      soDienThoai: u.soDienThoai,
      phongBan: u.phongBan,
      chucVu: u.chucVu,
      avatarUrl: u.avatarUrl,
      active: u.active,
      isLocked: u.isLocked,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
      roleId: u.roleId,
      roles: u.roleId && roleMap.has(u.roleId)
        ? { id: u.roleId, tenRole: roleMap.get(u.roleId)!.tenRole, color: roleMap.get(u.roleId)!.color }
        : null,
    }));

    return NextResponse.json({ accounts, total, page, limit });
  } catch (e) {
    return handleApiError(e);
  }
}
