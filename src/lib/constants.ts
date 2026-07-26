// Hằng số dùng chung giữa Edge middleware và server code (Node.js runtime).
// KHÔNG import firebase-admin/server-only vào file này — middleware.ts chạy
// trên Edge runtime, không có Node crypto nên phải giữ file này "sạch".
export const SESSION_COOKIE_NAME = "khoerp_session";

// Giữ nguyên tinh thần JWT_EXPIRE_MINUTES=1440 (24h) của bản gốc.
// Firebase session cookie tối đa cho phép 14 ngày.
export const SESSION_EXPIRES_IN_MS = 24 * 60 * 60 * 1000;
