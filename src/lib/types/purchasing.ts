export type TinhChatHangHoaMuaHang = "hang_hoa" | "dich_vu" | "nguyen_vat_lieu" | "cong_cu_dung_cu";

/**
 * Firestore collection "purchasing_hang_hoa" — doc id = ma.
 * Danh mục Hàng hóa/Dịch vụ riêng cho phân hệ Mua hàng — ĐỘC LẬP với
 * `warehouse_hang_hoa` (đang gắn theo từng kho cụ thể). Đơn mua hàng cần
 * chọn mặt hàng trước khi biết chắc sẽ nhập vào kho nào (hoặc mua dịch vụ
 * không nhập kho), nên không thể dùng lại danh mục theo-kho của phân hệ Kho.
 */
export interface HangHoaMuaHang {
  ma: string;
  ten: string;
  donViTinh?: string;
  tinhChat: TinhChatHangHoaMuaHang;
  moTa?: string;
  active: boolean;
  createdAt: string;
}

/**
 * Firestore collection "purchasing_ncc" — doc id = ma.
 * Danh mục Nhà cung cấp dùng chung toàn công ty. `soNgayDuocNo` là số ngày nợ
 * mặc định (net terms) — dùng để tự tính hạn thanh toán cho từng đơn mua hàng,
 * phục vụ tính "nợ quá hạn" ở phần Công nợ (Phần E).
 */
export interface NhaCungCap {
  ma: string;
  ten: string;
  diaChi?: string;
  maSoThue?: string;
  nguoiLienHe?: string;
  sdt?: string;
  email?: string;
  soTaiKhoanNganHang?: string;
  soNgayDuocNo?: number;
  active: boolean;
  createdAt: string;
}

export type TrangThaiDonMuaHang = "nhap" | "da_gui_ncc" | "da_xac_nhan" | "nhan_mot_phan" | "nhan_du" | "huy";

export interface ChiTietDonMuaHang {
  stt: number;
  maHang?: string;
  tenHang: string;
  donViTinh?: string;
  soLuongDat: number;
  donGia: number;
  thueGtgt: number;
  tienThue: number;
  thanhTien: number;
  /** Tự cập nhật bởi Phiếu Nhận hàng (Phần D) — KHÔNG sửa tay ở đơn mua hàng. */
  soLuongDaNhan: number;
}

/**
 * Firestore collection "purchasing_don_hang" — doc id = soChungTu (dùng
 * chung quy ước sinh số với các phiếu Kho: prefix-năm-số thứ tự, xem
 * `generateSoChungTu`). Prefix "DH" (Đơn Hàng).
 *
 * Tổng tiền: tongTienHang = tổng thanhTien các dòng (trước thuế, trước CK).
 * tienChietKhau = tongTienHang * chietKhauPhanTram/100 (chiết khấu áp ở cấp
 * đơn, không phân bổ ngược lại từng dòng để tính lại thuế — đơn giản hóa có
 * chủ đích, thuế mỗi dòng tính trên đơn giá gốc). tongTienThanhToan =
 * tongTienHang - tienChietKhau + tongTienThue.
 */
export interface DonMuaHang {
  soChungTu: string;
  maNCC: string;
  tenNCC?: string;
  khoNhanId?: string;
  phongBan?: string;
  congTrinh?: string;
  ngayDatHang: string;
  ngayGiaoDuKien?: string;
  trangThai: TrangThaiDonMuaHang;
  chiTiet: ChiTietDonMuaHang[];
  chietKhauPhanTram?: number;
  tongTienHang: number;
  tienChietKhau: number;
  tongTienThue: number;
  tongTienThanhToan: number;
  ghiChu?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChiTietNhanHang {
  stt: number;
  maHang?: string;
  tenHang: string;
  donViTinh?: string;
  soLuongDat: number;
  soLuongNhan: number;
  ghiChu?: string;
}

/**
 * Firestore collection "purchasing_nhan_hang" — doc id = soChungTu (prefix
 * "NH"). Gắn với 1 Đơn mua hàng (`donMuaHangId` = DonMuaHang.soChungTu) —
 * 1 đơn có thể có nhiều phiếu nhận (nhận từng phần nhiều đợt).
 *
 * KHÔNG tự động ghi vào sổ kho (ledger) — theo quyết định của Sếp, việc cộng
 * tồn kho thực tế vẫn phải làm tay riêng bên phân hệ Kho (tab Nhập kho) nếu
 * cần. Phiếu này chỉ theo dõi tiến độ giao hàng của NCC so với đơn đã đặt.
 */
export interface PhieuNhanHang {
  soChungTu: string;
  donMuaHangId: string;
  ngayNhan: string;
  nguoiNhan?: string;
  chiTiet: ChiTietNhanHang[];
  ghiChu?: string;
  createdBy?: string;
  createdAt: string;
}

export type HinhThucThanhToan = "tien_mat" | "chuyen_khoan";

/**
 * Firestore collection "purchasing_thanh_toan" — doc id = soChungTu (prefix
 * "TT"). Gắn với 1 NCC; `donMuaHangId` tùy chọn (nếu thanh toán cho đúng 1
 * đơn cụ thể) — để trống nếu là thanh toán chung/ứng trước không gắn đơn nào.
 * Công nợ được TÍNH ĐỘNG (không lưu số dư sẵn) từ tổng các đơn mua hàng trừ
 * tổng các phiếu thanh toán — xem `/api/purchasing/cong-no`.
 */
export interface PhieuThanhToanNCC {
  soChungTu: string;
  maNCC: string;
  tenNCC?: string;
  donMuaHangId?: string;
  soTien: number;
  ngayThanhToan: string;
  hinhThuc?: HinhThucThanhToan;
  ghiChu?: string;
  createdBy?: string;
  createdAt: string;
}
