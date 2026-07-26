// Stub cho gói "server-only" khi chạy dưới Vitest (không phải Next.js build
// pipeline). Bản thật của "server-only" throw ngay khi bị import ngoài ngữ
// cảnh Server Component của Next.js — vô hiệu hóa hoàn toàn trong test bằng
// cách alias sang file rỗng này (xem vitest.config.ts).
export {};
