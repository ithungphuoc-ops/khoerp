import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Có package-lock.json khác nằm ở thư mục cha (KHO TỔNG/) không liên quan tới
  // dự án này — ép rõ root tại đây để Next không tự đoán nhầm workspace root.
  outputFileTracingRoot: path.join(__dirname),
  // firebase-admin kéo theo jwks-rsa -> jose; khi Next.js bundle bằng webpack,
  // jwks-rsa require() bản ESM của jose gây lỗi ERR_REQUIRE_ESM lúc chạy trên
  // Vercel (không lộ ra khi chạy `next dev`). Để Node tự resolve trực tiếp từ
  // node_modules thay vì bundle.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
