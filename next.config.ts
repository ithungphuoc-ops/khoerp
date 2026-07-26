import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Có package-lock.json khác nằm ở thư mục cha (KHO TỔNG/) không liên quan tới
  // dự án này — ép rõ root tại đây để Next không tự đoán nhầm workspace root.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
