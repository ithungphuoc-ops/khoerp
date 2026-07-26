import "server-only";
import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/server/session";
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

async function resolveRole(roleId?: string | null): Promise<{ role: string; roleColor: string }> {
  if (!roleId) return { role: DEFAULT_ROLE_NAME, roleColor: DEFAULT_ROLE_COLOR };
  const snap = await adminDb.collection("roles").doc(roleId).get();
  if (!snap.exists) return { role: DEFAULT_ROLE_NAME, roleColor: DEFAULT_ROLE_COLOR };
  const data = snap.data() as Role;
  return { role: data.tenRole || DEFAULT_ROLE_NAME, roleColor: data.color || DEFAULT_ROLE_COLOR };
}

async function findDefaultRoleId(): Promise<string | null> {
  const snap = await adminDb.collection("roles").where("tenRole", "==", DEFAULT_ROLE_NAME).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

/**
 * Lấy user trong Firestore theo uid; nếu chưa có (lần đăng nhập đầu tiên qua
 * Firebase Auth) thì tự tạo với role mặc định NHAN_VIEN — tương đương
 * _query_system_user / _create_system_user của bản Python gốc.
 */
export async function getOrCreateAppUser(uid: string, email: string): Promise<CurrentUser> {
  const ref = adminDb.collection("users").doc(uid);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data() as AppUser;
    const { role, roleColor } = await resolveRole(data.roleId);
    return {
      id: uid,
      email: data.email,
      hoTen: data.hoTen || email.split("@")[0],
      chucVu: data.chucVu || "",
      phongBan: data.phongBan || "",
      avatarUrl: data.avatarUrl,
      roleId: data.roleId ?? null,
      role,
      roleColor,
    };
  }

  const roleId = await findDefaultRoleId();
  const now = new Date().toISOString();
  const newUser: AppUser = {
    id: uid,
    email,
    hoTen: email.split("@")[0],
    roleId,
    active: true,
    isLocked: false,
    loginAttempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(newUser, { merge: true });

  const { role, roleColor } = await resolveRole(roleId);
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

export async function touchLastLogin(uid: string): Promise<void> {
  await adminDb.collection("users").doc(uid).set(
    { lastLogin: new Date().toISOString() },
    { merge: true }
  );
}

/** Đọc + xác thực session cookie hiện tại từ next/headers. Trả về null nếu chưa đăng nhập. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;

  const decoded = await verifySessionCookie(cookie);
  if (!decoded || !decoded.uid || !decoded.email) return null;

  return getOrCreateAppUser(decoded.uid, decoded.email);
}
