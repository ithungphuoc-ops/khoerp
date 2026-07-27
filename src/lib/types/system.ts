/**
 * Firestore collection "roles" — doc id = auto id (KHÔNG lưu lại id vào field,
 * doc.id của Firestore đã đóng vai trò đó — tránh trùng key khi spread).
 * Nguồn gốc: bảng system.roles (sql/001_system_schema.sql).
 */
export interface Role {
  tenRole: string;
  moTa?: string;
  color: string;
  active: boolean;
  createdAt: string; // ISO timestamp
}

/**
 * Firestore subcollection "roles/{roleId}/permissions" — doc id = moduleCode.
 * Thay cho bảng join system.permissions(role_id, module_code) — mỗi role sở hữu
 * trực tiếp danh sách quyền của mình, tránh phải query 2 lượt như bản Postgres.
 */
export interface Permission {
  moduleCode: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canImport: boolean;
  canExport: boolean;
  canAi: boolean;
  canReport: boolean;
}

/**
 * Firestore collection "modules" — doc id = code (module code, vd "warehouse").
 * Dùng code làm doc id để khỏi phải tra UUID như bản gốc.
 */
export interface Module {
  code: string;
  ten: string;
  moTa?: string;
  icon?: string;
  route?: string;
  parentCode?: string | null;
  thuTu: number;
  active: boolean;
  isBeta: boolean;
  createdAt: string;
}

/**
 * Firestore collection "users" — doc id = Firebase Auth UID.
 * roleId trỏ tới doc id trong "roles".
 */
export interface AppUser {
  email: string;
  hoTen?: string;
  avatarUrl?: string;
  roleId?: string | null;
  phongBan?: string;
  chucVu?: string;
  soDienThoai?: string;
  active: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
  username?: string;
  ngaySinh?: string | null;
  gioiTinh?: "Nam" | "Nữ" | "Khác" | null;
  moTa?: string;
  isLocked: boolean;
  lockedAt?: string | null;
  lockedReason?: string;
  loginAttempts: number;
}

/**
 * Firestore subcollection "users/{uid}/notifications" — doc id = auto id.
 * Đặt dưới user thay vì top-level để khớp tự nhiên với rule "chỉ xem của mình".
 */
export interface Notification {
  tieuDe: string;
  noiDung?: string;
  loai: "info" | "success" | "warning" | "error";
  moduleCode?: string;
  link?: string;
  daDoc: boolean;
  createdAt: string;
}

/**
 * Firestore collection "activity_log" — doc id = auto id. Chỉ ghi qua Admin SDK.
 */
export interface ActivityLog {
  userId?: string;
  moduleCode?: string;
  action: string;
  entity?: string;
  entityId?: string;
  moTa?: string;
  ipAddress?: string;
  createdAt: string;
}

/**
 * Firestore collection "groups" — doc id = auto id.
 * memberIds thay cho bảng join system.user_groups (denormalize theo hướng Firestore).
 */
export interface Group {
  tenNhom: string;
  moTa?: string;
  color: string;
  active: boolean;
  memberIds: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Firestore collection "settings" — doc id = key (vd "password_min_length").
 */
export interface Setting {
  key: string;
  value: string;
  moTa?: string;
  nhom: string;
  updatedBy?: string;
  updatedAt: string;
}

/** DTO của GET /api/iam/roles — dùng bởi trang Vai trò và bộ chọn vai trò. */
export interface RoleRow {
  id: string;
  tenRole: string;
  moTa?: string;
  color: string;
  active: boolean;
}

/** DTO của GET /api/iam/accounts — dùng bởi trang Nhóm để chọn thành viên. */
export interface AccountRow {
  id: string;
  email: string;
  hoTen?: string;
  username?: string;
  soDienThoai?: string;
  phongBan?: string;
  chucVu?: string;
  avatarUrl?: string;
  active: boolean;
  isLocked: boolean;
  lastLogin?: string | null;
  createdAt: string;
  roleId?: string | null;
  roles: { id: string; tenRole: string; color: string } | null;
}
