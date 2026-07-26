import "server-only";
import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

// Khởi tạo lazy (chỉ chạy khi thực sự được gọi ở runtime, không phải lúc import
// module). Nếu init ngay tại top-level, bước "Collecting page data" của
// `next build` sẽ import file route.ts -> import module này -> throw ngay cả khi
// build không hề gọi tới Firestore/Auth, vì FIREBASE_SERVICE_ACCOUNT_KEY thường
// chưa có ở môi trường build.
let app: App | undefined;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY chưa được cấu hình trong .env");
  }
  return JSON.parse(raw);
}

function getAdminApp(): App {
  if (!app) {
    if (getApps().length) {
      app = getApp();
    } else if (process.env.FIRESTORE_EMULATOR_HOST) {
      // Chạy nhắm vào Firebase Local Emulator Suite (test) — không cần service
      // account thật, chỉ cần projectId khớp với .firebaserc để Admin SDK trỏ
      // đúng emulator instance.
      app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || "khoerp-test" });
    } else {
      app = initializeApp({ credential: cert(loadServiceAccount()) });
    }
  }
  return app;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

// Proxy để các chỗ gọi vẫn viết `adminDb.collection(...)` / `adminAuth.verifyIdToken(...)`
// như đang dùng instance thật, nhưng thực chất mỗi lần truy cập property mới
// resolve app (lazy) — tránh phải sửa lại toàn bộ call site sang dạng hàm.
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const value = (getAdminDb() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(getAdminDb()) : value;
  },
});

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const value = (getAdminAuth() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(getAdminAuth()) : value;
  },
});
