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
  | { kind: "ok"; user: CurrentUser };

/**
 * Xác thực đầy đủ: verify cookie hpcore + đọc app_permissions + đồng bộ profile.
 * Phân biệt rõ 2 trường hợp thất bại (giống bản Python tham chiếu):
 *   - "unauthenticated": chưa đăng nhập hpcore → cần redirect account.hpcore.vn/login
 *   - "forbidden": đã đăng nhập hpcore nhưng chưa được cấp quyền app này → hiện
 *     thông báo tại chỗ, KHÔNG redirect (tránh vòng lặp vô hạn).
 */
/**
 * ⚠️ TẠM THỜI (theo yêu cầu Sếp, giai đoạn test nội bộ trước khi go-live thật):
 * bỏ chặn "forbidden" — ai đăng nhập được HPCore cũng vào test khoerp được
 * luôn, không cần chờ cấp app_permissions riêng. Mặc định coi như ADMIN để
 * test đầy đủ mọi thao tác (tạo kho, nhập/xuất/chuyển...). Việc cấp quyền
 * theo từng người sẽ làm lại sau khi test xong.
 *
 * Để BẬT LẠI chặn theo quyền: xóa biến này và dòng `role = TEMP_OPEN_ROLE`
 * bên dưới, để nguyên `if (!role) return { kind: "forbidden" };` như cũ.
 */
const TEMP_OPEN_ACCESS = true;
const TEMP_OPEN_ROLE = "ADMIN";

export async function getAuthState(): Promise<AuthState> {
  const session = await getHpcoreSession();
  if (!session) return { kind: "unauthenticated" };

  let role = await getHpcoreAppRole(session.uid);
  if (!role) {
    if (TEMP_OPEN_ACCESS) {
      role = TEMP_OPEN_ROLE;
    } else {
      return { kind: "forbidden" };
    }
  }

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
