import "server-only";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_EXPIRES_IN_MS } from "@/lib/constants";
import type { DecodedIdToken } from "firebase-admin/auth";

export { SESSION_COOKIE_NAME, SESSION_EXPIRES_IN_MS } from "@/lib/constants";

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS });
}

/**
 * Xác thực session cookie. `checkRevoked=true` để phát hiện tài khoản bị khóa/xóa
 * ngay lập tức thay vì đợi cookie hết hạn (tương đương việc get_current_user bản
 * gốc luôn query lại DB thay vì tin JWT cũ).
 */
export async function verifySessionCookie(cookie: string): Promise<DecodedIdToken | null> {
  try {
    return await adminAuth.verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}
