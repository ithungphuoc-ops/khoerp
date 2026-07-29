import "server-only";
import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";
import { verifyHpcoreSession, getHpcoreAppRole, getHpcorePlatformRole, type HpcoreSession } from "@/lib/firebase/hpcoreAdmin";
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

/**
 * Tìm role khoerp khớp với tên role hpcore đã cấp (vd "KHO_TRUONG") — hpcore
 * chỉ biết TÊN role (lấy từ GET /api/roles của chính khoerp), còn ma trận
 * quyền chi tiết theo từng module vẫn do khoerp tự quản lý. Trả nguyên cả
 * doc (không chỉ id) để khỏi phải đọc lại lần 2 lấy màu — trước đây tách
 * riêng findRoleIdByName() + resolveRoleById() nghĩa là 2 lượt đọc Firestore
 * cho cùng 1 thông tin, gộp lại còn 1 lượt.
 */
async function findRoleByName(tenRole: string): Promise<{ id: string; tenRole: string; color: string } | null> {
  const snap = await adminDb.collection("roles").where("tenRole", "==", tenRole).limit(1).get();
  if (snap.empty) return null;
  const data = snap.docs[0].data() as Role;
  return { id: snap.docs[0].id, tenRole: data.tenRole || DEFAULT_ROLE_NAME, color: data.color || DEFAULT_ROLE_COLOR };
}

const LAST_LOGIN_WRITE_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Đồng bộ profile Firestore nội bộ (users/{uid}) từ session + vai trò hpcore.
 * hpcore là nguồn xác thực danh tính + vai trò cấp app; khoerp chỉ lưu thêm các
 * field đặc thù của mình (họ tên, chức vụ, phòng ban...) và roleId để tra ma
 * trận quyền chi tiết đã xây ở Phase 3.
 *
 * Hàm này chạy trong requireUser() — tức MỌI route API đều đi qua đây, nên
 * mỗi round-trip Firestore thừa ở đây làm chậm TOÀN BỘ app mỗi lần chuyển
 * tab/thao tác. Tối ưu 2 chỗ so với bản trước:
 *  1) Đọc profile (ref.get) và tra role (findRoleByName) chạy SONG SONG thay
 *     vì tuần tự — 2 việc này không phụ thuộc nhau.
 *  2) Chỉ GHI lastLogin nếu đã cũ hơn 5 phút (trước đây ghi Firestore vô
 *     điều kiện ở MỌI request, tốn nhất trong toàn bộ chuỗi này).
 */
async function syncAppUser(session: HpcoreSession, hpcoreRole: string): Promise<CurrentUser> {
  const { uid, email } = session;
  const ref = adminDb.collection("users").doc(uid);
  const now = new Date().toISOString();

  const [snap, roleMatch] = await Promise.all([ref.get(), findRoleByName(hpcoreRole)]);
  const roleId = roleMatch?.id ?? null;
  const role = roleMatch?.tenRole ?? DEFAULT_ROLE_NAME;
  const roleColor = roleMatch?.color ?? DEFAULT_ROLE_COLOR;

  if (snap.exists) {
    const data = snap.data() as AppUser;
    const roleChanged = data.roleId !== roleId;
    const lastLoginStale = !data.lastLogin || Date.now() - new Date(data.lastLogin).getTime() > LAST_LOGIN_WRITE_THROTTLE_MS;
    if (roleChanged || lastLoginStale) {
      const update: Record<string, unknown> = { lastLogin: now };
      if (roleChanged) {
        update.roleId = roleId;
        update.updatedAt = now;
      }
      await ref.set(update, { merge: true });
    }
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
  | { kind: "developing" }
  | { kind: "ok"; user: CurrentUser };

/** Vai trò cấp nền tảng HPCore (`users/{uid}.role` ở hpcons-portal) được phép vào khoerp trong giai đoạn phát triển. */
const PLATFORM_ROLES_DUOC_VAO = new Set(["owner"]);

/**
 * Xác thực đầy đủ: verify cookie hpcore + đọc app_permissions + đồng bộ profile.
 * Phân biệt rõ các trường hợp thất bại:
 *   - "unauthenticated": chưa đăng nhập hpcore → cần redirect account.hpcore.vn/login
 *   - "developing": đã đăng nhập hpcore hợp lệ nhưng KHÔNG phải tài khoản owner —
 *     khoerp đang trong giai đoạn phát triển, chỉ owner được vào xem/dùng thử;
 *     mọi tài khoản khác (kể cả đã có app_permissions.khoerp) đều bị chặn, hiện
 *     màn hình "Đang phát triển" thay vì vào được app.
 *   - "forbidden": (dự phòng, hiện không kích hoạt vì đã chặn sớm hơn ở bước
 *     "developing") đã đăng nhập nhưng chưa được cấp quyền app này.
 */
export async function getAuthState(): Promise<AuthState> {
  const session = await getHpcoreSession();
  if (!session) return { kind: "unauthenticated" };

  const platformRole = await getHpcorePlatformRole(session.uid);
  if (!platformRole || !PLATFORM_ROLES_DUOC_VAO.has(platformRole)) {
    return { kind: "developing" };
  }

  const role = (await getHpcoreAppRole(session.uid)) || "ADMIN";
  const user = await syncAppUser(session, role);
  return { kind: "ok", user };
}

/** Trả về user hiện tại hoặc null (gộp cả 2 trường hợp thất bại) — dùng khi route không cần phân biệt 401/403. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const state = await getAuthState();
  return state.kind === "ok" ? state.user : null;
}

/** Dùng trong route handler: throw ApiError(401) nếu chưa đăng nhập hpcore, 403 nếu chưa được cấp quyền/app đang phát triển. */
export async function requireUser(): Promise<CurrentUser> {
  const state = await getAuthState();
  if (state.kind === "unauthenticated") throw new ApiError(401, "Chưa đăng nhập");
  if (state.kind === "developing") throw new ApiError(403, "Ứng dụng đang trong quá trình phát triển, vui lòng quay lại sau.");
  if (state.kind === "forbidden") throw new ApiError(403, "Chưa được cấp quyền truy cập khoerp. Liên hệ quản trị viên.");
  return state.user;
}
