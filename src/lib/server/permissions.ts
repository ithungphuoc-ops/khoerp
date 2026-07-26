import type { CurrentUser } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/apiError";

/**
 * Bản gốc (routers/permissions.py) hard-code role_id dạng UUID của một
 * instance Supabase cụ thể, và trộn lẫn 2 kiểu tên role ("ADMIN" tiếng Anh ở
 * chỗ seed SQL vs "QUẢN TRỊ VIÊN" tiếng Việt ở modules.py/roles.py) — đây là
 * một điểm không nhất quán/lỗi của bản gốc. Ở bản viết lại này, dùng thẳng
 * tên role (không phụ thuộc UUID cụ thể của environment nào) và thống nhất
 * theo đúng tên đã seed trong sql/001_system_schema.sql.
 */
const ADMIN_ROLES = new Set(["ADMIN"]);
const MANAGER_ROLES = new Set(["ADMIN", "MANAGER"]);
const KHO_ROLES = new Set(["ADMIN", "MANAGER", "KHO_TRUONG", "THU_KHO"]);

export function isAdmin(user: Pick<CurrentUser, "role">): boolean {
  return ADMIN_ROLES.has(user.role);
}

export function isManager(user: Pick<CurrentUser, "role">): boolean {
  return MANAGER_ROLES.has(user.role);
}

export function isKho(user: Pick<CurrentUser, "role">): boolean {
  return KHO_ROLES.has(user.role);
}

export function requireAdmin(user: Pick<CurrentUser, "role">, message = "Không có quyền truy cập"): void {
  if (!isAdmin(user)) throw new ApiError(403, message);
}

export function requireManager(user: Pick<CurrentUser, "role">, message = "Không có quyền truy cập"): void {
  if (!isManager(user)) throw new ApiError(403, message);
}
