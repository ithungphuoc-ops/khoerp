/**
 * Firestore collection "warehouse_kho" — doc id = maKho (vd "VPP").
 * Dùng mã kho làm doc id — Admin SDK phải dùng docRef.create() khi tạo mới để
 * giữ tính duy nhất (Firestore không có UNIQUE constraint như Postgres).
 */
export interface Kho {
  maKho: string;
  tenKho: string;
  diaChi?: string;
  moTa?: string;
  active: boolean;
  createdAt: string;
}

/** Firestore collection "warehouse_hang_hoa" — doc id = maHang. */
export interface HangHoa {
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
}

/** Một dòng chi tiết nhúng trong phiếu (thay cho bảng *_ct riêng ở Postgres). */
export interface ChiTietPhieu {
  stt: number;
  hangHoaId: string; // = maHang, doc id của warehouse_hang_hoa
  maHang: string;
  tenHang: string;
  donViTinh?: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  ghiChu?: string;
  tkNo?: string;
  tkCo?: string;
}

export type TrangThaiPhieu = "nhap" | "da_duyet";

/**
 * Firestore collection "warehouse_phieu_nhap" — doc id = soChungTu (vd "NK00001").
 */
export interface PhieuNhapKho {
  soChungTu: string;
  ngayHachToan: string; // YYYY-MM-DD
  ngayChungTu: string;
  khoId: string; // = maKho
  nhaCungCap?: string;
  nguoiGiao?: string;
  lyDoNhap: string;
  tongTien: number;
  ghiChu?: string;
  dinhKem?: string;
  trangThai: TrangThaiPhieu;
  chiTiet: ChiTietPhieu[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
}

/** Chi tiết phiếu xuất — có thêm congTrinh so với chi tiết phiếu nhập. */
export interface ChiTietPhieuXuat extends ChiTietPhieu {
  congTrinh?: string;
}

/** Firestore collection "warehouse_phieu_xuat" — doc id = soChungTu (vd "XK00001"). */
export interface PhieuXuatKho {
  soChungTu: string;
  ngayHachToan: string;
  ngayChungTu: string;
  khoId: string;
  nguoiNhan?: string;
  diaChi?: string;
  nhanVienXuat?: string;
  lyDoXuat: string;
  phongBan?: string;
  congTrinh?: string;
  diaDiemGiao?: string;
  tongTien: number;
  ghiChu?: string;
  dinhKem?: string;
  trangThai: TrangThaiPhieu;
  chiTiet: ChiTietPhieuXuat[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
}

export type LoaiChuyenKho = "noi_bo" | "van_chuyen" | "dai_ly";

/** Firestore collection "warehouse_phieu_chuyen" — doc id = soChungTu (vd "CK00001"). */
export interface PhieuChuyenKho {
  soChungTu: string;
  loaiChuyen: LoaiChuyenKho;
  ngayHachToan: string;
  ngayChungTu: string;
  khoXuatId?: string; // = maKho
  khoNhapId?: string;
  lenhDieuDong?: string;
  ngayLenh?: string;
  cua?: string;
  veViec?: string;
  maDonViNhan?: string;
  tenDonViNhan?: string;
  mstDonViNhan?: string;
  maNguoiVc?: string;
  tenNguoiVc?: string;
  hopDongVc?: string;
  phuongTienVc?: string;
  tongSoLuong: number;
  trangThai: TrangThaiPhieu;
  ghiChu?: string;
  chiTiet: ChiTietPhieu[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
}

/**
 * Firestore collection "warehouse_ton_kho" — doc id = `${khoId}_${hangHoaId}`.
 * Doc id dạng ghép để đọc/ghi bằng point-read trong transaction (không cần query),
 * tương đương SELECT ... FOR UPDATE trên bảng warehouse.ton_kho ở bản Postgres.
 */
export interface TonKho {
  khoId: string;
  hangHoaId: string;
  soLuong: number;
  updatedAt: string;
}

export type TransactionType =
  | "IMPORT"
  | "EXPORT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT"
  | "INVENTORY"
  | "REVERSAL";

export type RefType = "nhap_kho" | "xuat_kho" | "chuyen_kho" | "dieu_chinh" | "kiem_ke";

/**
 * Firestore collection "warehouse_ledger" — doc id = auto id. Append-only,
 * không bao giờ UPDATE/DELETE. Thay cho warehouse.warehouse_transaction.
 */
export interface WarehouseLedgerEntry {
  id: string;
  transactionType: TransactionType;
  refType: RefType;
  refId: string;
  khoId: string;
  hangHoaId: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  direction: 1 | -1;
  stockBefore: number;
  stockAfter: number;
  createdBy?: string | null;
  createdAt: string;
  notes?: string | null;
}

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "POST" | "APPROVE" | "REVERSE" | "ADJUST";

/** Firestore collection "warehouse_audit_log" — doc id = auto id. Best-effort. */
export interface WarehouseAuditLog {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  entityNumber?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  module: string;
  createdAt: string;
}

/** Input cho một dòng movement gửi vào Warehouse Engine (xem lib/server/warehouse-engine.ts). */
export interface StockMovementInput {
  khoId: string;
  hangHoaId: string;
  soLuong: number;
  donGia: number;
  direction: 1 | -1;
  transactionType: TransactionType;
  notes?: string;
}
