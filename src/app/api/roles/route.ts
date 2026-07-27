import { NextResponse } from "next/server";

/**
 * Danh sách vai trò của app này — hpcore (account.hpcore.vn) gọi endpoint này
 * (public, KHÔNG cần đăng nhập) để hiển thị lựa chọn khi admin hpcore cấp
 * quyền cho user vào khoerp qua app_permissions. Giữ đúng convention của các
 * app con khác (PKD, ITAsset, KhoUNICE): trả cứng danh sách, không đọc DB.
 *
 * Khớp với 6 role đã seed trong sql/001_system_schema.sql của bản gốc Python.
 */
export async function GET() {
  return NextResponse.json({
    roles: [
      { key: "ADMIN", label: "Quản trị viên" },
      { key: "MANAGER", label: "Quản lý" },
      { key: "KHO_TRUONG", label: "Trưởng kho" },
      { key: "THU_KHO", label: "Thủ kho" },
      { key: "KE_TOAN", label: "Kế toán" },
      { key: "NHAN_VIEN", label: "Nhân viên" },
    ],
  });
}
