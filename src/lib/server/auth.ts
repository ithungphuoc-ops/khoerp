import "server-only";
import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";
import { verifyHpcoreSession, getHpcoreAppRole, type HpcoreSession } from "@/lib/firebase/hpcoreAdmin";
import { HPCORE_SESSION_COOKIE } from "@/lib/constants";
import { ApiError } from "@/lib/server/apiError";
import type { AppUser, Role } from "@/lib/types/system";

const DEFAULT_ROLE_NAME = "NHAN_VIEN";
const DEFAULT_ROLE_COLOR = "#6b7280";

export interface CurrentUser {
  id: string;
  email: string;
  hoTen: string;
  chucVu: string;
  phongBan: string;
  avatarUrl?: string;
  roleId: string | null;
  role: string;
  roleColor: string;
}

async function resolveRoleById(roleId?: string | null): Promise<{ role: string; roleColor: string }> {
  if (!roleId) return { role: DEFAULT_ROLE_NAME, roleColor: DEFAULT_ROLE_COLOR };
  const snap = await adminDb.collection("roles").doc(roleId).get();
  if (!snap.exists) return { role: DEFAULT_ROLE_NAME, roleColor: DEFAULT_ROLE_COLOR };
  const data = snap.data() as Role;
  return { role: data.tenRole || DEFAULT_ROLE_NAME, roleColor: data.color || DEFAULT_ROLE_COLOR };
}

/** Tìm roleId khoerp khớp với tên role hpcore đã cấp (vd "KHO_TRUONG") — hpcore chỉ
 * biết TÊN role (lấy từ GET /api/roles của chính khoerp), còn ma trận quyền chi
 * tiết theo từng module vẫn do khoerp tự quản lý (roles/{roleId}/permissions). */
async function findRoleIdByName(tenRole: string): Promise<string | null> {
  const snap = await adminDb.collection("roles").where("tenRole", "==", tenRole).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

/**
 * Đồng bộ profile Firestore nội bộ (users/{uid}) từ session + vai trò hpcore.
 * hpcore là nguồn xác thực danh tính + vai trò cấp app; khoerp chỉ lưu thêm các
 * field đặc thù của mình (họ tên, chức vụ, phòng ban...) và roleId để tra ma
 * trận quyền chi tiết đã xây ở Phase 3.
 */
async function syncAppUser(session: HpcoreSession, hpcoreRole: string): Promise<CurrentUser> {
  const { uid, email } = session;
  const ref = adminDb.collection("users").doc(uid);
  const snap = await ref.get();
  const roleId = (await findRoleIdByName(hpcoreRole)) ?? null;
  const now = new Date().toISOString();

  if (snap.exists) {
    const data = snap.data() as AppUser;
    if (data.roleId !== roleId || data.lastLogin === undefined) {
      await ref.set({ roleId, lastLogin: now, updatedAt: now }, { merge: true });
    } else {
      await ref.set({ lastLogin: now }, { merge: true });
    }
    const { role, roleColor } = await resolveRoleById(roleId);
    return {
      id: uid,
      email: data.email || email,
      hoTen: data.hoTen || email.split("@")[0],
      chucVu: data.chucVu || "",
      phongBan: data.phongBan || "",
      avatarUrl: data.avatarUrl,
      roleId,
      role,
      roleColor,
    };
  }

  const newUser: AppUser = {
    email,
    hoTen: email.split("@")[0],
    roleId,
    active: true,
    isLocked: false,
    loginAttempts: 0,
    lastLogin: now,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(newUser, { merge: true });

  const { role, roleColor } = await resolveRoleById(roleId);
  return {
    id: uid,
    email,
    hoTen: newUser.hoTen!,
    chucVu: "",
    phongBan: "",
    roleId,
    role,
    roleColor,
  };
}

/** Chỉ verify cookie session hpcore — CHƯA kiểm tra quyền cho app này. */
export async function getHpcoreSession(): Promise<HpcoreSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(HPCORE_SESSION_COOKIE)?.value;
  return verifyHpcoreSession(cookie);
}

export type AuthState =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "ok"; user: CurrentUser };

/**
 * Xác thực đầy đủ: verify cookie hpcore + đọc app_permissions + đồng bộ profile.
 * Phân biệt rõ 2 trường hợp thất bại (giống bản Python tham chiếu):
 *   - "unauthenticated": chưa đăng nhập hpcore → cần redirect account.hpcore.vn/login
 *   - "forbidden": đã đăng nhập hpcore nhưng chưa được cấp quyền app này → hiện
 *     thông báo tại chỗ, KHÔNG redirect (tránh vòng lặp vô hạn).
 */
export async function getAuthState(): Promise<AuthState> {
  const session = await getHpcoreSession();
  if (!session) return { kind: "unauthenticated" };

  const role = await getHpcoreAppRole(session.uid);
  if (!role) return { kind: "forbidden" };

  const user = await syncAppUser(session, role);
  return { kind: "ok", user };
}

/** Trả về user hiện tại hoặc null (gộp cả 2 trường hợp thất bại) — dùng khi route không cần phân biệt 401/403. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const state = await getAuthState();
  return state.kind === "ok" ? state.user : null;
}

/** Dùng trong route handler: throw ApiError(401) nếu chưa đăng nhập hpcore, 403 nếu chưa được cấp quyền app này. */
export async function requireUser(): Promise<CurrentUser> {
  const state = await getAuthState();
  if (state.kind === "unauthenticated") throw new ApiError(401, "Chưa đăng nhập");
  if (state.kind === "forbidden") throw new ApiError(403, "Chưa được cấp quyền truy cập khoerp. Liên hệ quản trị viên.");
  return state.user;
}
