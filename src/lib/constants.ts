// Hằng số dùng chung giữa Edge middleware và server code (Node.js runtime).
// KHÔNG import firebase-admin/server-only vào file này — middleware.ts chạy
// trên Edge runtime, không có Node crypto nên phải giữ file này "sạch".

/**
 * khoerp KHÔNG tự đăng nhập nữa — toàn bộ đăng nhập xảy ra ở account.hpcore.vn
 * (nền tảng SSO trung tâm HPCore). Cookie "session" dùng chung domain
 * ".hpcore.vn" nên mọi app con (kể cả khoerp.hpcore.vn) tự động nhận được.
 * Xem src/lib/firebase/hpcoreAdmin.ts + design tham chiếu từ KhoUNICE_Web_NEW
 * (openspec/changes/remove-local-auth-hpcore-sso).
 */
export const HPCORE_SESSION_COOKIE = "session";
export const HPCORE_LOGIN_URL = "https://account.hpcore.vn/login";

/**
 * ⚠️ CHƯA CHỐT — id của khoerp trong app_permissions/{uid}.{appId} và
 * rolesEndpoint của hpcore. Đây là placeholder tạm (giống cách KhoUNICE_Web_NEW
 * tạm dùng "warehouse" chưa chốt) — cần Sếp xác nhận/đăng ký với người quản lý
 * dashboardApps.ts bên repo hpcons-portal trước khi đưa vào production, nếu
 * không đúng tên thì admin hpcore gán quyền sẽ không khớp app này.
 */
export const HPCORE_APP_ID = "khoerp";
