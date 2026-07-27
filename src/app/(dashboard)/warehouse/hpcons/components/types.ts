export interface KhoRow {
  maKho: string;
  tenKho: string;
  diaChi?: string;
  moTa?: string;
  active: boolean;
  createdAt: string;
}

export interface HangHoaRow {
  /** Doc id thật trong Firestore (`${khoId}_${maHang}`) — dùng cho URL sửa/xóa. */
  id?: string;
  khoId: string;
  maHang: string;
  tenHang: string;
  donViTinh?: string;
  nhomHang?: string;
  giaNhap: number;
  giaBan: number;
  moTa?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  /** Tồn kho hiện tại của hàng này tại đúng kho (khoId) của nó. */
  tonKho?: number;
  /** Chỉ có khi xem "Tất cả kho" — thông tin kho để hiển thị cột "Kho". */
  kho?: { maKho: string; tenKho: string } | null;
}

export interface ChiTietRow {
  stt: number;
  hangHoaId?: string;
  maHang: string;
  tenHang: string;
  donViTinh?: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  tkNo?: string;
  tkCo?: string;
  congTrinh?: string;
  ghiChu?: string;
  /** Chỉ dùng hiển thị UI (không gửi lên API) — tồn kho hiện tại của hàng này tại kho đang thao tác. */
  tonKhoHienTai?: number;
}

export function emptyChiTietRow(stt: number): ChiTietRow {
  return { stt, maHang: "", tenHang: "", donViTinh: "", soLuong: 1, donGia: 0, thanhTien: 0 };
}

/** Chuyển chi_tiết dạng UI (camelCase) sang body snake_case mà API mong đợi. */
export function chiTietToBody(rows: ChiTietRow[]) {
  return rows.map((r) => ({
    ma_hang: r.maHang,
    ten_hang: r.tenHang,
    hang_hoa_id: r.hangHoaId,
    don_vi_tinh: r.donViTinh,
    so_luong: r.soLuong,
    don_gia: r.donGia,
    tk_no: r.tkNo,
    tk_co: r.tkCo,
    cong_trinh: r.congTrinh,
    ghi_chu: r.ghiChu,
  }));
}
