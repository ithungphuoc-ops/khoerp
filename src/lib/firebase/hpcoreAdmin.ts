import "server-only";
import { cert, getApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { HPCORE_APP_ID } from "@/lib/constants";

/**
 * Firebase app THỨ HAI trong cùng process — trỏ vào project `hpcons-portal`
 * (nền tảng SSO trung tâm HPCore), tách biệt hoàn toàn với app mặc định
 * (`hpcons-khoerp`) ở lib/firebase/admin.ts. Đặt tên "hpcore" để
 * getApps()/getApp("hpcore") không đụng với app mặc định — giống hệt cách
 * bản Python tham chiếu dùng `firebase_admin.initialize_app(cred, name="hpcore")`.
 */
let hpcoreApp: App | undefined;

function loadServiceAccount() {
  const raw = process.env.HPCORE_FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("Thiếu HPCORE_FIREBASE_SERVICE_ACCOUNT trong environment");
  }
  return JSON.parse(raw);
}

function getHpcoreApp(): App {
  if (!hpcoreApp) {
    try {
      hpcoreApp = getApp("hpcore");
    } catch {
      hpcoreApp = initializeApp({ credential: cert(loadServiceAccount()) }, "hpcore");
    }
  }
  return hpcoreApp;
}

export interface HpcoreSession {
  uid: string;
  email: string;
}

/**
 * Verify session cookie hpcore (KHÔNG kiểm tra quyền cho app này — chỉ xác
 * nhận đã đăng nhập hpcore hay chưa). Trả về null nếu cookie thiếu/hết hạn/
 * không hợp lệ.
 */
export async function verifyHpcoreSession(cookie: string | undefined): Promise<HpcoreSession | null> {
  if (!cookie) return null;
  try {
    const decoded = await getAuth(getHpcoreApp()).verifySessionCookie(cookie, true);
    if (!decoded.uid || !decoded.email) return null;
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

/**
 * Đọc vai trò của user cho app này từ `app_permissions/{uid}.{HPCORE_APP_ID}`
 * trong Firestore của hpcons-portal. Trả về null nếu chưa được cấp quyền —
 * KHÔNG mặc định cho vào (đúng tinh thần "closed directory" của hpcore).
 */
export async function getHpcoreAppRole(uid: string): Promise<string | null> {
  const db = getFirestore(getHpcoreApp());
  const snap = await db.collection("app_permissions").doc(uid).get();
  if (!snap.exists) return null;
  const role = snap.data()?.[HPCORE_APP_ID];
  return typeof role === "string" && role ? role : null;
}
