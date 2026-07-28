"use client";

/**
 * PhieuDetailModal — popup XEM (không sửa/xóa) chi tiết đầy đủ của 1 phiếu,
 * dùng chung cho cả 4 loại (Nhập/Xuất/Chuyển/Kiểm kê) dựa vào refType. Dùng
 * ở các báo cáo (double-click 1 dòng để xem lại phiếu gốc) — không thay thế
 * DetailPanel quản lý riêng của từng tab (vẫn có Sửa/Xóa ở đó).
 */
import { useEffect, useState } from "react";
import { X, RefreshCw, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, ClipboardCheck } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { RefType } from "@/lib/types/warehouse";

interface ChiTietFinancial {
  maHang?: string;
  tenHang?: string;
  donViTinh?: string;
  soLuong?: number;
  donGia?: number;
  thanhTien?: number;
}

interface ChiTietKiemKeRow {
  maHang?: string;
  tenHang?: string;
  donViTinh?: string;
  soLuongHeThong?: number;
  soLuongThucTe?: number;
  chenhLech?: number;
}

interface PhieuData {
  soChungTu: string;
  ngayHachToan?: string;
  ngayKiemKe?: string;
  ghiChu?: string;
  tongTien?: number;
  kho?: { tenKho: string } | null;
  kho_xuat?: { tenKho: string } | null;
  kho_nhap?: { tenKho: string } | null;
  chiTiet: (ChiTietFinancial & ChiTietKiemKeRow)[];
  [key: string]: unknown;
}

const CONFIG: Record<string, { title: string; icon: typeof ArrowDownToLine; color: string; endpoint: (id: string) => string; isKiemKe?: boolean }> = {
  nhap_kho: { title: "Phiếu Nhập kho", icon: ArrowDownToLine, color: "text-hp-primary", endpoint: (id) => `/warehouse/nhap-kho/${id}` },
  xuat_kho: { title: "Phiếu Xuất kho", icon: ArrowUpFromLine, color: "text-hp-danger", endpoint: (id) => `/warehouse/xuat-kho/${id}` },
  chuyen_kho: { title: "Phiếu Chuyển kho", icon: ArrowRightLeft, color: "text-hp-warning", endpoint: (id) => `/warehouse/chuyen-kho/${id}` },
  kiem_ke: { title: "Phiếu Kiểm kê", icon: ClipboardCheck, color: "text-hp-accent", endpoint: (id) => `/warehouse/kiem-ke/${id}`, isKiemKe: true },
};

function infoFields(refType: string, p: PhieuData): { label: string; value: string }[] {
  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("vi-VN") : "—");
  switch (refType) {
    case "nhap_kho":
      return [
        { label: "Kho nhập", value: p.kho?.tenKho || "—" },
        { label: "Ngày hạch toán", value: fmtDate(p.ngayHachToan) },
        { label: "Nhà cung cấp", value: (p.nhaCungCap as string) || "—" },
        { label: "Người giao hàng", value: (p.nguoiGiao as string) || "—" },
        { label: "Diễn giải", value: (p.lyDoNhap as string) || "—" },
      ];
    case "xuat_kho":
      return [
        { label: "Kho xuất", value: p.kho?.tenKho || "—" },
        { label: "Ngày hạch toán", value: fmtDate(p.ngayHachToan) },
        { label: "Người nhận", value: (p.nguoiNhan as string) || "—" },
        { label: "Phòng ban", value: (p.phongBan as string) || "—" },
        { label: "Công trình", value: (p.congTrinh as string) || "—" },
        { label: "Diễn giải", value: (p.lyDoXuat as string) || "—" },
      ];
    case "chuyen_kho":
      return [
        { label: "Kho xuất", value: p.kho_xuat?.tenKho || "—" },
        { label: "Kho nhập", value: p.kho_nhap?.tenKho || "—" },
        { label: "Ngày hạch toán", value: fmtDate(p.ngayHachToan) },
        { label: "Người chuyển", value: (p.nguoiChuyen as string) || "—" },
        { label: "Diễn giải", value: (p.lyDoChuyen as string) || "—" },
      ];
    case "kiem_ke":
      return [
        { label: "Kho", value: p.kho?.tenKho || "—" },
        { label: "Ngày kiểm kê", value: fmtDate(p.ngayKiemKe) },
        { label: "Người kiểm kê", value: (p.nguoiKiemKe as string) || "—" },
        { label: "Lý do", value: (p.lyDo as string) || "—" },
      ];
    default:
      return [];
  }
}

export function PhieuDetailModal({ refType, refId, onClose }: { refType: string | RefType; refId: string; onClose: () => void }) {
  const [phieu, setPhieu] = useState<PhieuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const cfg = CONFIG[refType];

  useEffect(() => {
    if (!cfg) {
      setErr("Không nhận diện được loại phiếu");
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<PhieuData>(cfg.endpoint(refId))
      .then(setPhieu)
      .catch((e) => setErr(e instanceof Error ? e.message : "Lỗi tải phiếu"))
      .finally(() => setLoading(false));
  }, [refType, refId, cfg]);

  const Icon = cfg?.icon || ArrowDownToLine;
  const tongTien = (phieu?.chiTiet || []).reduce((s, r) => s + (r.thanhTien || 0), 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border">
          <div className="flex items-center gap-2">
            <Icon size={16} className={cfg?.color || "text-hp-primary"} />
            <span className="font-semibold text-hp-text">{cfg?.title || "Phiếu"} — {refId}</span>
          </div>
          <button onClick={onClose} className="hp-btn-ghost p-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <RefreshCw size={20} className="animate-spin text-hp-text-muted" />
            </div>
          ) : err || !phieu ? (
            <p className="text-sm text-hp-danger py-10 text-center">{err || "Không tìm thấy phiếu"}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {infoFields(refType, phieu).map(({ label, value }) => (
                  <div key={label} className="bg-hp-surface rounded-hp-md p-3">
                    <p className="text-xs text-hp-text-muted mb-0.5">{label}</p>
                    <p className="text-hp-text font-medium">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-medium text-hp-text-muted mb-2 uppercase tracking-wide">Chi tiết</p>
                <div className="border border-hp-border rounded-hp-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-hp-surface text-hp-text-muted text-xs">
                        <th className="px-3 py-2 text-left w-8">#</th>
                        <th className="px-3 py-2 text-left w-24">Mã hàng</th>
                        <th className="px-3 py-2 text-left">Tên hàng</th>
                        <th className="px-3 py-2 text-center w-16">ĐVT</th>
                        {cfg?.isKiemKe ? (
                          <>
                            <th className="px-3 py-2 text-right w-24">Tồn hệ thống</th>
                            <th className="px-3 py-2 text-right w-24">Thực tế</th>
                            <th className="px-3 py-2 text-right w-20">Chênh lệch</th>
                          </>
                        ) : (
                          <>
                            <th className="px-3 py-2 text-right w-20">Số lượng</th>
                            <th className="px-3 py-2 text-right w-24">Đơn giá</th>
                            <th className="px-3 py-2 text-right w-28">Thành tiền</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(phieu.chiTiet || []).length === 0 ? (
                        <tr>
                          <td colSpan={cfg?.isKiemKe ? 7 : 7} className="py-6 text-center text-hp-text-muted text-xs">
                            Không có dòng hàng
                          </td>
                        </tr>
                      ) : (
                        phieu.chiTiet.map((row, i) => (
                          <tr key={i} className="border-t border-hp-border">
                            <td className="px-3 py-1.5 text-hp-text-muted text-xs">{i + 1}</td>
                            <td className="px-3 py-1.5 text-hp-text font-medium">{row.maHang || "—"}</td>
                            <td className="px-3 py-1.5 text-hp-text">{row.tenHang || "—"}</td>
                            <td className="px-3 py-1.5 text-center text-hp-text-muted">{row.donViTinh || "—"}</td>
                            {cfg?.isKiemKe ? (
                              <>
                                <td className="px-3 py-1.5 text-right text-hp-text-muted">{row.soLuongHeThong}</td>
                                <td className="px-3 py-1.5 text-right text-hp-text">{row.soLuongThucTe}</td>
                                <td
                                  className={`px-3 py-1.5 text-right font-medium ${
                                    (row.chenhLech || 0) > 0 ? "text-hp-success" : (row.chenhLech || 0) < 0 ? "text-hp-danger" : "text-hp-text-muted"
                                  }`}
                                >
                                  {(row.chenhLech || 0) > 0 ? `+${row.chenhLech}` : row.chenhLech}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-3 py-1.5 text-right text-hp-text">{row.soLuong}</td>
                                <td className="px-3 py-1.5 text-right text-hp-text">{(row.donGia || 0).toLocaleString("vi-VN")}</td>
                                <td className="px-3 py-1.5 text-right text-hp-text font-medium">{(row.thanhTien || 0).toLocaleString("vi-VN")}</td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                    {!cfg?.isKiemKe && (
                      <tfoot>
                        <tr className="border-t border-hp-border bg-hp-surface">
                          <td colSpan={7} className="px-3 py-2 text-right text-sm font-semibold text-hp-text">
                            Tổng: {tongTien.toLocaleString("vi-VN")} đ
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {phieu.ghiChu && (
                <div>
                  <p className="text-xs text-hp-text-muted mb-1">Ghi chú</p>
                  <p className="text-sm text-hp-text bg-hp-surface rounded-hp-md px-3 py-2">{phieu.ghiChu}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-hp-border flex justify-end">
          <button onClick={onClose} className="hp-btn-secondary">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
