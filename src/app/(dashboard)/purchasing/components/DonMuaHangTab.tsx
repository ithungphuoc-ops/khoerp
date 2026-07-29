"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, RefreshCw, Trash2, ChevronLeft, ChevronRight, ShoppingCart, X, Save, Edit2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/apiClient";
import { EntityAutocomplete } from "@/components/EntityAutocomplete";
import { HangHoaMuaHangInput } from "./HangHoaMuaHangInput";
import type { HangHoaMuaHang, TrangThaiDonMuaHang } from "@/lib/types/purchasing";

interface KhoRow {
  maKho: string;
  tenKho: string;
}

interface ChiTietRow {
  maHang?: string;
  tenHang: string;
  donViTinh?: string;
  soLuongDat: number;
  donGia: number;
  thueGtgt: number;
  tienThue: number;
  thanhTien: number;
  soLuongDaNhan?: number;
}

function emptyRow(): ChiTietRow {
  return { tenHang: "", donViTinh: "", soLuongDat: 1, donGia: 0, thueGtgt: 0, tienThue: 0, thanhTien: 0 };
}

interface DonHangListItem {
  soChungTu: string;
  maNCC: string;
  tenNCC?: string;
  ngayDatHang: string;
  ngayGiaoDuKien?: string;
  trangThai: TrangThaiDonMuaHang;
  tongTienThanhToan: number;
  kho: KhoRow | null;
}

interface DonHangDetail {
  soChungTu: string;
  maNCC: string;
  tenNCC?: string;
  khoNhanId?: string;
  phongBan?: string;
  congTrinh?: string;
  ngayDatHang: string;
  ngayGiaoDuKien?: string;
  trangThai: TrangThaiDonMuaHang;
  chiTiet: ChiTietRow[];
  chietKhauPhanTram?: number;
  tongTienHang: number;
  tienChietKhau: number;
  tongTienThue: number;
  tongTienThanhToan: number;
  ghiChu?: string;
  kho: KhoRow | null;
}

const TRANG_THAI_LABEL: Record<TrangThaiDonMuaHang, { label: string; className: string }> = {
  nhap: { label: "Nháp", className: "bg-hp-text-muted/15 text-hp-text-muted" },
  da_gui_ncc: { label: "Đã gửi NCC", className: "bg-hp-primary/15 text-hp-primary" },
  da_xac_nhan: { label: "Đã xác nhận", className: "bg-hp-primary/15 text-hp-primary" },
  nhan_mot_phan: { label: "Nhận một phần", className: "bg-hp-warning/15 text-hp-warning" },
  nhan_du: { label: "Nhận đủ", className: "bg-hp-success/15 text-hp-success" },
  huy: { label: "Hủy", className: "bg-hp-danger/15 text-hp-danger" },
};

const TRANG_THAI_CHON_TAY: TrangThaiDonMuaHang[] = ["nhap", "da_gui_ncc", "da_xac_nhan", "huy"];

function TrangThaiBadge({ trangThai }: { trangThai: TrangThaiDonMuaHang }) {
  const info = TRANG_THAI_LABEL[trangThai] || { label: trangThai, className: "bg-hp-text-muted/15 text-hp-text-muted" };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${info.className}`}>{info.label}</span>;
}

interface DonHangForm {
  ma_ncc: string;
  ten_ncc: string;
  kho_nhan_id: string;
  phong_ban: string;
  cong_trinh: string;
  ngay_dat_hang: string;
  ngay_giao_du_kien: string;
  trang_thai: TrangThaiDonMuaHang;
  chiet_khau_phan_tram: number;
  ghi_chu: string;
}

function tinhChiTietRow(row: ChiTietRow): ChiTietRow {
  const thanhTien = (Number(row.soLuongDat) || 0) * (Number(row.donGia) || 0);
  const tienThue = (thanhTien * (Number(row.thueGtgt) || 0)) / 100;
  return { ...row, thanhTien, tienThue };
}

function DonHangModal({ khoList, don, onClose, onSaved }: { khoList: KhoRow[]; don: DonHangDetail | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!don;
  const today = new Date().toISOString().slice(0, 10);
  const daNhanMotPhan = isEdit && don.chiTiet.some((ct) => (ct.soLuongDaNhan || 0) > 0);

  const [form, setForm] = useState<DonHangForm>(() =>
    isEdit
      ? {
          ma_ncc: don.maNCC,
          ten_ncc: don.tenNCC || "",
          kho_nhan_id: don.khoNhanId || "",
          phong_ban: don.phongBan || "",
          cong_trinh: don.congTrinh || "",
          ngay_dat_hang: don.ngayDatHang?.slice(0, 10) || today,
          ngay_giao_du_kien: don.ngayGiaoDuKien?.slice(0, 10) || "",
          trang_thai: don.trangThai,
          chiet_khau_phan_tram: don.chietKhauPhanTram || 0,
          ghi_chu: don.ghiChu || "",
        }
      : {
          ma_ncc: "",
          ten_ncc: "",
          kho_nhan_id: khoList[0]?.maKho || "",
          phong_ban: "",
          cong_trinh: "",
          ngay_dat_hang: today,
          ngay_giao_du_kien: "",
          trang_thai: "nhap",
          chiet_khau_phan_tram: 0,
          ghi_chu: "",
        }
  );
  const [chiTiet, setChiTiet] = useState<ChiTietRow[]>(() => (isEdit && don.chiTiet.length ? don.chiTiet.map((r) => ({ ...r })) : [emptyRow()]));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof DonHangForm>(k: K, v: DonHangForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function updateCT<K extends keyof ChiTietRow>(i: number, k: K, v: ChiTietRow[K]) {
    setChiTiet((prev) => {
      const rows = [...prev];
      rows[i] = tinhChiTietRow({ ...rows[i], [k]: v });
      return rows;
    });
  }

  function handleSelectHH(i: number, hh: HangHoaMuaHang) {
    setChiTiet((prev) => {
      const rows = [...prev];
      rows[i] = tinhChiTietRow({ ...rows[i], maHang: hh.ma, tenHang: hh.ten, donViTinh: hh.donViTinh || "" });
      return rows;
    });
  }

  function addRow() {
    setChiTiet((prev) => [...prev, emptyRow()]);
  }
  function removeRow(i: number) {
    setChiTiet((prev) => prev.filter((_, idx) => idx !== i));
  }

  const tongTienHang = chiTiet.reduce((s, r) => s + (r.thanhTien || 0), 0);
  const tongTienThue = chiTiet.reduce((s, r) => s + (r.tienThue || 0), 0);
  const tienChietKhau = (tongTienHang * (Number(form.chiet_khau_phan_tram) || 0)) / 100;
  const tongThanhToan = tongTienHang - tienChietKhau + tongTienThue;

  async function handleSave() {
    if (!form.ma_ncc) return setErr("Vui lòng chọn nhà cung cấp");
    if (!form.ngay_dat_hang) return setErr("Vui lòng chọn ngày đặt hàng");
    if (chiTiet.length === 0 || chiTiet.every((r) => !r.tenHang)) return setErr("Vui lòng thêm ít nhất 1 dòng hàng");
    setSaving(true);
    setErr(null);
    try {
      const body = {
        ma_ncc: form.ma_ncc,
        ten_ncc: form.ten_ncc,
        kho_nhan_id: form.kho_nhan_id || undefined,
        phong_ban: form.phong_ban || undefined,
        cong_trinh: form.cong_trinh || undefined,
        ngay_dat_hang: form.ngay_dat_hang,
        ngay_giao_du_kien: form.ngay_giao_du_kien || undefined,
        trang_thai: form.trang_thai,
        chiet_khau_phan_tram: Number(form.chiet_khau_phan_tram) || 0,
        ghi_chu: form.ghi_chu || undefined,
        chi_tiet: daNhanMotPhan
          ? undefined
          : chiTiet.map((r) => ({
              ma_hang: r.maHang,
              ten_hang: r.tenHang,
              don_vi_tinh: r.donViTinh,
              so_luong_dat: Number(r.soLuongDat) || 0,
              don_gia: Number(r.donGia) || 0,
              thue_gtgt: Number(r.thueGtgt) || 0,
            })),
      };
      if (isEdit) {
        await api.put(`/purchasing/don-hang/${don.soChungTu}`, body);
      } else {
        await api.post("/purchasing/don-hang", body);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : isEdit ? "Lỗi cập nhật đơn mua hàng" : "Lỗi tạo đơn mua hàng");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-hp-primary" />
            <span className="font-semibold text-hp-text">{isEdit ? `Sửa đơn mua hàng — ${don.soChungTu}` : "Tạo đơn mua hàng"}</span>
          </div>
          <button onClick={onClose} className="hp-btn-ghost p-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {daNhanMotPhan && (
            <div className="flex items-center gap-2 bg-hp-warning/10 border border-hp-warning/30 rounded-hp-md px-3 py-2 text-xs text-hp-warning">
              <AlertTriangle size={14} className="shrink-0" />
              Đơn đã có hàng nhận — chỉ có thể sửa thông tin chung, không sửa được danh sách hàng hóa.
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Nhà cung cấp *</label>
              <EntityAutocomplete
                apiPath="/purchasing/ncc"
                value={form.ten_ncc}
                placeholder="Gõ tên/mã NCC..."
                onChange={(row) => {
                  set("ma_ncc", row.ma);
                  set("ten_ncc", row.ten);
                }}
                onTextChange={(v) => set("ten_ncc", v)}
              />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Kho nhận</label>
              <select className="hp-input w-full" value={form.kho_nhan_id} onChange={(e) => set("kho_nhan_id", e.target.value)}>
                <option value="">-- Không chọn --</option>
                {khoList.map((k) => (
                  <option key={k.maKho} value={k.maKho}>
                    {k.tenKho}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Trạng thái</label>
              <select className="hp-input w-full" value={form.trang_thai} onChange={(e) => set("trang_thai", e.target.value as TrangThaiDonMuaHang)}>
                {TRANG_THAI_CHON_TAY.map((t) => (
                  <option key={t} value={t}>
                    {TRANG_THAI_LABEL[t].label}
                  </option>
                ))}
                {isEdit && (don.trangThai === "nhan_mot_phan" || don.trangThai === "nhan_du") && (
                  <option value={don.trangThai} disabled>
                    {TRANG_THAI_LABEL[don.trangThai].label} (hệ thống tự set)
                  </option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Phòng ban</label>
              <EntityAutocomplete apiPath="/warehouse/phong-ban" value={form.phong_ban} onChange={(row) => set("phong_ban", row.ten)} onTextChange={(v) => set("phong_ban", v)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Công trình</label>
              <EntityAutocomplete apiPath="/warehouse/cong-trinh" value={form.cong_trinh} onChange={(row) => set("cong_trinh", row.ten)} onTextChange={(v) => set("cong_trinh", v)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Ngày đặt hàng *</label>
              <input type="date" className="hp-input w-full" value={form.ngay_dat_hang} onChange={(e) => set("ngay_dat_hang", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Ngày giao dự kiến</label>
              <input type="date" className="hp-input w-full" value={form.ngay_giao_du_kien} onChange={(e) => set("ngay_giao_du_kien", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Chiết khấu (%)</label>
              <input
                type="number"
                className="hp-input w-full"
                value={form.chiet_khau_phan_tram}
                onChange={(e) => set("chiet_khau_phan_tram", Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-hp-text-muted mb-2 uppercase tracking-wide">Hàng hóa</p>
            <div className="border border-hp-border rounded-hp-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-hp-surface text-hp-text-muted text-xs">
                    <th className="px-2 py-2 text-left w-8">#</th>
                    <th className="px-2 py-2 text-left">Tên hàng</th>
                    <th className="px-2 py-2 text-center w-16">ĐVT</th>
                    <th className="px-2 py-2 text-right w-20">SL đặt</th>
                    <th className="px-2 py-2 text-right w-28">Đơn giá</th>
                    <th className="px-2 py-2 text-right w-16">%Thuế</th>
                    <th className="px-2 py-2 text-right w-24">Tiền thuế</th>
                    <th className="px-2 py-2 text-right w-28">Thành tiền</th>
                    {daNhanMotPhan && <th className="px-2 py-2 text-right w-20">Đã nhận</th>}
                    <th className="w-7"></th>
                  </tr>
                </thead>
                <tbody>
                  {chiTiet.map((row, i) => (
                    <tr key={i} className="border-t border-hp-border hover:bg-hp-surface/50">
                      <td className="px-2 py-1 text-hp-text-muted text-xs">{i + 1}</td>
                      <td className="px-2 py-1">
                        {daNhanMotPhan ? (
                          <span className="text-hp-text">{row.tenHang}</span>
                        ) : (
                          <HangHoaMuaHangInput value={row.tenHang} placeholder="Tên hàng hóa/dịch vụ" onChange={(hh) => handleSelectHH(i, hh)} onTextChange={(v) => updateCT(i, "tenHang", v)} />
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="hp-input w-full py-0.5 text-center"
                          value={row.donViTinh || ""}
                          readOnly={daNhanMotPhan}
                          onChange={(e) => updateCT(i, "donViTinh", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className="hp-input w-full py-0.5 text-right"
                          value={row.soLuongDat}
                          readOnly={daNhanMotPhan}
                          onChange={(e) => updateCT(i, "soLuongDat", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className="hp-input w-full py-0.5 text-right"
                          value={row.donGia}
                          readOnly={daNhanMotPhan}
                          onChange={(e) => updateCT(i, "donGia", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className="hp-input w-full py-0.5 text-right"
                          value={row.thueGtgt}
                          readOnly={daNhanMotPhan}
                          onChange={(e) => updateCT(i, "thueGtgt", Number(e.target.value))}
                        />
                      </td>
                      <td className="px-2 py-1 text-right text-hp-text-muted">{(row.tienThue || 0).toLocaleString("vi-VN")}</td>
                      <td className="px-2 py-1 text-right text-hp-text">{(row.thanhTien || 0).toLocaleString("vi-VN")}</td>
                      {daNhanMotPhan && <td className="px-2 py-1 text-right text-hp-text-muted">{row.soLuongDaNhan || 0}</td>}
                      <td className="px-1 py-1">
                        {!daNhanMotPhan && (
                          <button onClick={() => removeRow(i)} className="text-hp-text-muted hover:text-hp-danger">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-hp-border bg-hp-surface">
                    <td colSpan={daNhanMotPhan ? 9 : 8} className="px-2 py-1.5 text-right text-hp-text-muted">
                      Tổng tiền hàng:
                    </td>
                    <td className="px-2 py-1.5 text-right text-hp-text">{tongTienHang.toLocaleString("vi-VN")}</td>
                  </tr>
                  <tr className="bg-hp-surface">
                    <td colSpan={daNhanMotPhan ? 9 : 8} className="px-2 py-1.5 text-right text-hp-text-muted">
                      Chiết khấu ({form.chiet_khau_phan_tram || 0}%):
                    </td>
                    <td className="px-2 py-1.5 text-right text-hp-danger">-{tienChietKhau.toLocaleString("vi-VN")}</td>
                  </tr>
                  <tr className="bg-hp-surface">
                    <td colSpan={daNhanMotPhan ? 9 : 8} className="px-2 py-1.5 text-right text-hp-text-muted">
                      Thuế GTGT:
                    </td>
                    <td className="px-2 py-1.5 text-right text-hp-text">{tongTienThue.toLocaleString("vi-VN")}</td>
                  </tr>
                  <tr className="border-t border-hp-border bg-hp-surface">
                    <td colSpan={daNhanMotPhan ? 9 : 8} className="px-2 py-2 text-right text-sm font-semibold text-hp-text">
                      Tổng tiền thanh toán:
                    </td>
                    <td className="px-2 py-2 text-right text-sm font-semibold text-hp-primary">{tongThanhToan.toLocaleString("vi-VN")} đ</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {!daNhanMotPhan && (
              <button onClick={addRow} className="mt-2 hp-btn-ghost text-xs gap-1">
                <Plus size={12} /> Thêm dòng
              </button>
            )}
          </div>

          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Ghi chú</label>
            <textarea className="hp-input w-full" rows={2} value={form.ghi_chu} onChange={(e) => set("ghi_chu", e.target.value)} />
          </div>
          {err && <p className="text-xs text-hp-danger">{err}</p>}
        </div>

        <div className="px-5 py-3 border-t border-hp-border flex justify-between">
          <button onClick={onClose} className="hp-btn-secondary">
            Hủy
          </button>
          <button onClick={handleSave} disabled={saving} className="hp-btn-primary gap-1.5">
            <Save size={14} /> {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ don, onClose, onEdit, onDelete }: { don: DonHangDetail; onClose: () => void; onEdit: () => void; onDelete: () => Promise<void> }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const daNhanMotPhan = don.chiTiet.some((ct) => (ct.soLuongDaNhan || 0) > 0);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-hp-border bg-hp-surface/50">
        <div className="flex items-center gap-2">
          <ShoppingCart size={14} className="text-hp-primary" />
          <span className="text-sm font-semibold text-hp-text">Đơn mua hàng — {don.soChungTu}</span>
          <TrangThaiBadge trangThai={don.trangThai} />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="hp-btn-ghost px-2 py-1 text-xs gap-1 text-hp-primary">
            <Edit2 size={12} /> Sửa
          </button>
          {!daNhanMotPhan && (
            <button onClick={() => setConfirmDel(true)} className="hp-btn-ghost px-2 py-1 text-xs gap-1 text-hp-danger">
              <Trash2 size={12} /> Xóa
            </button>
          )}
          <button onClick={onClose} className="hp-btn-ghost p-1 text-hp-text-muted hover:text-hp-text">
            <X size={14} />
          </button>
        </div>
      </div>

      {confirmDel && (
        <div className="mx-4 mt-3 flex items-center gap-3 bg-hp-danger/10 border border-hp-danger/30 rounded-hp-md px-4 py-3">
          <AlertTriangle size={16} className="text-hp-danger shrink-0" />
          <span className="text-sm text-hp-danger flex-1">
            Xóa đơn <strong>{don.soChungTu}</strong>?
          </span>
          <button onClick={() => setConfirmDel(false)} className="hp-btn-ghost text-xs px-2 py-1">
            Hủy
          </button>
          <button onClick={handleDelete} disabled={deleting} className="bg-hp-danger text-white text-xs px-3 py-1.5 rounded-hp-md hover:opacity-90 disabled:opacity-50">
            {deleting ? "Đang xóa..." : "Xác nhận xóa"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            { label: "Nhà cung cấp", value: don.tenNCC || don.maNCC },
            { label: "Kho nhận", value: don.kho?.tenKho || "—" },
            { label: "Phòng ban", value: don.phongBan || "—" },
            { label: "Công trình", value: don.congTrinh || "—" },
            { label: "Ngày đặt hàng", value: don.ngayDatHang ? new Date(don.ngayDatHang).toLocaleDateString("vi-VN") : "—" },
            { label: "Ngày giao dự kiến", value: don.ngayGiaoDuKien ? new Date(don.ngayGiaoDuKien).toLocaleDateString("vi-VN") : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-hp-surface rounded-hp-md p-3">
              <p className="text-xs text-hp-text-muted mb-0.5">{label}</p>
              <p className="text-hp-text font-medium">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-hp-text-muted mb-2 uppercase tracking-wide">Hàng hóa</p>
          <div className="border border-hp-border rounded-hp-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-hp-surface text-hp-text-muted text-xs">
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Tên hàng</th>
                  <th className="px-3 py-2 text-center w-14">ĐVT</th>
                  <th className="px-3 py-2 text-right w-16">SL đặt</th>
                  <th className="px-3 py-2 text-right w-16">Đã nhận</th>
                  <th className="px-3 py-2 text-right w-24">Đơn giá</th>
                  <th className="px-3 py-2 text-right w-16">%Thuế</th>
                  <th className="px-3 py-2 text-right w-24">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {don.chiTiet.map((row, i) => (
                  <tr key={i} className="border-t border-hp-border hover:bg-hp-surface/50">
                    <td className="px-3 py-1.5 text-hp-text-muted text-xs">{i + 1}</td>
                    <td className="px-3 py-1.5 text-hp-text">{row.tenHang}</td>
                    <td className="px-3 py-1.5 text-center text-hp-text-muted">{row.donViTinh || "—"}</td>
                    <td className="px-3 py-1.5 text-right text-hp-text">{row.soLuongDat}</td>
                    <td className="px-3 py-1.5 text-right text-hp-text-muted">{row.soLuongDaNhan || 0}</td>
                    <td className="px-3 py-1.5 text-right text-hp-text">{(row.donGia || 0).toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-1.5 text-right text-hp-text-muted">{row.thueGtgt || 0}%</td>
                    <td className="px-3 py-1.5 text-right text-hp-text font-medium">{(row.thanhTien || 0).toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-hp-border bg-hp-surface">
                  <td colSpan={7} className="px-3 py-1.5 text-right text-hp-text-muted">
                    Tổng tiền hàng:
                  </td>
                  <td className="px-3 py-1.5 text-right text-hp-text">{don.tongTienHang.toLocaleString("vi-VN")}</td>
                </tr>
                <tr className="bg-hp-surface">
                  <td colSpan={7} className="px-3 py-1.5 text-right text-hp-text-muted">
                    Chiết khấu ({don.chietKhauPhanTram || 0}%):
                  </td>
                  <td className="px-3 py-1.5 text-right text-hp-danger">-{don.tienChietKhau.toLocaleString("vi-VN")}</td>
                </tr>
                <tr className="bg-hp-surface">
                  <td colSpan={7} className="px-3 py-1.5 text-right text-hp-text-muted">
                    Thuế GTGT:
                  </td>
                  <td className="px-3 py-1.5 text-right text-hp-text">{don.tongTienThue.toLocaleString("vi-VN")}</td>
                </tr>
                <tr className="border-t border-hp-border bg-hp-surface">
                  <td colSpan={7} className="px-3 py-2 text-right text-sm font-semibold text-hp-text">
                    Tổng tiền thanh toán:
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-hp-primary">{don.tongTienThanhToan.toLocaleString("vi-VN")} đ</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {don.ghiChu && (
          <div>
            <p className="text-xs text-hp-text-muted mb-1">Ghi chú</p>
            <p className="text-sm text-hp-text bg-hp-surface rounded-hp-md px-3 py-2">{don.ghiChu}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function DonMuaHangTab() {
  const [items, setItems] = useState<DonHangListItem[]>([]);
  const [khoList, setKhoList] = useState<KhoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDon, setSelectedDon] = useState<DonHangDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editDon, setEditDon] = useState<DonHangDetail | null>(null);
  const limit = 20;

  useEffect(() => {
    api
      .get<{ items: KhoRow[] }>("/warehouse/kho")
      .then((r) => setKhoList(r.items || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      const res = await api.get<{ items: DonHangListItem[]; total: number }>(`/purchasing/don-hang?${params}`);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(item: DonHangListItem) {
    try {
      const detail = await api.get<DonHangDetail>(`/purchasing/don-hang/${item.soChungTu}`);
      setSelectedDon(detail);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete() {
    if (!selectedDon) return;
    await api.delete(`/purchasing/don-hang/${selectedDon.soChungTu}`);
    setSelectedDon(null);
    load();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col border-b border-hp-border" style={{ minHeight: 0, flex: "0 0 auto", maxHeight: "55%" }}>
        <div className="flex items-center gap-2 flex-wrap px-4 py-3">
          <button onClick={() => setShowCreate(true)} className="hp-btn-primary gap-1.5 text-sm">
            <Plus size={14} /> Thêm đơn mua hàng
          </button>
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hp-text-muted" />
            <input
              className="hp-input w-full pl-8"
              placeholder="Tìm số đơn, nhà cung cấp..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button onClick={load} className="hp-btn-ghost">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-hp-surface text-hp-text-muted text-xs border-b border-hp-border">
                <th className="px-4 py-2.5 text-left">Ngày đặt</th>
                <th className="px-4 py-2.5 text-left">Số đơn</th>
                <th className="px-4 py-2.5 text-left">Nhà cung cấp</th>
                <th className="px-4 py-2.5 text-left">Kho nhận</th>
                <th className="px-4 py-2.5 text-left">Trạng thái</th>
                <th className="px-4 py-2.5 text-right">Tổng thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-hp-text-muted">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-1" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-hp-text-muted text-sm">
                    Chưa có đơn mua hàng nào
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.soChungTu}
                    onClick={() => openDetail(item)}
                    className={`border-t border-hp-border hover:bg-hp-surface/50 cursor-pointer transition-colors ${
                      selectedDon?.soChungTu === item.soChungTu ? "bg-hp-primary/5 border-l-2 border-l-hp-primary" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{new Date(item.ngayDatHang).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-2.5 font-medium text-hp-primary">{item.soChungTu}</td>
                    <td className="px-4 py-2.5 text-hp-text">{item.tenNCC || item.maNCC}</td>
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.kho?.tenKho || "—"}</td>
                    <td className="px-4 py-2.5">
                      <TrangThaiBadge trangThai={item.trangThai} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-hp-text">{(item.tongTienThanhToan || 0).toLocaleString("vi-VN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-2 text-xs text-hp-text-muted border-t border-hp-border">
          <span>Tổng số: {total} bản ghi</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="hp-btn-ghost p-1 disabled:opacity-40">
                <ChevronLeft size={12} />
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="hp-btn-ghost p-1 disabled:opacity-40">
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {!selectedDon ? (
          <div className="flex flex-col items-center justify-center h-full text-hp-text-muted gap-3">
            <ShoppingCart size={32} className="opacity-30" />
            <p className="text-sm">Chọn đơn mua hàng để xem chi tiết</p>
          </div>
        ) : (
          <DetailPanel don={selectedDon} onClose={() => setSelectedDon(null)} onEdit={() => setEditDon(selectedDon)} onDelete={handleDelete} />
        )}
      </div>

      {showCreate && (
        <DonHangModal
          khoList={khoList}
          don={null}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {editDon && (
        <DonHangModal
          khoList={khoList}
          don={editDon}
          onClose={() => setEditDon(null)}
          onSaved={() => {
            setEditDon(null);
            load();
            api
              .get<DonHangDetail>(`/purchasing/don-hang/${editDon.soChungTu}`)
              .then((d) => setSelectedDon(d))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
