"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, RefreshCw, X, Save, Edit2, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/apiClient";

interface CongNoNCCRow {
  maNCC: string;
  tenNCC: string;
  tongDatHang: number;
  daThanhToan: number;
  conNo: number;
}

interface CongNoSummary {
  tongNoPhaiTra: number;
  noQuaHan: number;
  daThanhToan30Ngay: number;
  theoNCC: CongNoNCCRow[];
}

interface NhaCungCapRow {
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

function NhaCungCapModal({ item, onClose, onSaved }: { item: NhaCungCapRow | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    ma: item?.ma || "",
    ten: item?.ten || "",
    dia_chi: item?.diaChi || "",
    ma_so_thue: item?.maSoThue || "",
    nguoi_lien_he: item?.nguoiLienHe || "",
    sdt: item?.sdt || "",
    email: item?.email || "",
    so_tai_khoan_ngan_hang: item?.soTaiKhoanNganHang || "",
    so_ngay_duoc_no: item?.soNgayDuocNo ?? undefined,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.ma || !form.ten) return setErr("Vui lòng nhập mã và tên nhà cung cấp");
    setSaving(true);
    setErr(null);
    try {
      if (isEdit) {
        await api.put(`/purchasing/ncc/${item.ma}`, form);
      } else {
        await api.post("/purchasing/ncc", form);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : isEdit ? "Lỗi cập nhật nhà cung cấp" : "Lỗi tạo nhà cung cấp");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border">
          <div className="flex items-center gap-2">
            {isEdit && <Edit2 size={14} className="text-hp-primary" />}
            <span className="font-semibold text-hp-text">{isEdit ? `Sửa nhà cung cấp — ${item.ma}` : "Thêm nhà cung cấp"}</span>
          </div>
          <button onClick={onClose} className="hp-btn-ghost p-1">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Mã NCC *</label>
              <input className="hp-input w-full" value={form.ma} onChange={(e) => set("ma", e.target.value)} placeholder="NCC001" readOnly={isEdit} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Mã số thuế</label>
              <input className="hp-input w-full" value={form.ma_so_thue} onChange={(e) => set("ma_so_thue", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Tên nhà cung cấp *</label>
            <input className="hp-input w-full" value={form.ten} onChange={(e) => set("ten", e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Địa chỉ</label>
            <input className="hp-input w-full" value={form.dia_chi} onChange={(e) => set("dia_chi", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Người liên hệ</label>
              <input className="hp-input w-full" value={form.nguoi_lien_he} onChange={(e) => set("nguoi_lien_he", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">SĐT</label>
              <input className="hp-input w-full" value={form.sdt} onChange={(e) => set("sdt", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Email</label>
              <input className="hp-input w-full" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Số ngày được nợ</label>
              <input
                type="number"
                className="hp-input w-full"
                value={form.so_ngay_duoc_no ?? ""}
                onChange={(e) => set("so_ngay_duoc_no", e.target.value === "" ? undefined : Number(e.target.value))}
                placeholder="30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Số tài khoản ngân hàng</label>
            <input className="hp-input w-full" value={form.so_tai_khoan_ngan_hang} onChange={(e) => set("so_tai_khoan_ngan_hang", e.target.value)} />
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

export function NhaCungCapTab() {
  const [items, setItems] = useState<NhaCungCapRow[]>([]);
  const [congNo, setCongNo] = useState<CongNoSummary | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<NhaCungCapRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await api.get<{ items: NhaCungCapRow[] }>(`/purchasing/ncc?${params}`);
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadCongNo = useCallback(async () => {
    try {
      const res = await api.get<CongNoSummary>("/purchasing/cong-no");
      setCongNo(res);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    load();
    loadCongNo();
  }, [load, loadCongNo]);

  const conNoByMa = new Map((congNo?.theoNCC || []).map((c) => [c.maNCC, c.conNo]));

  return (
    <div className="p-5 space-y-4">
      {congNo && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-hp-surface rounded-hp-md p-3 border border-hp-border">
            <div className="flex items-center gap-1.5 text-xs text-hp-text-muted mb-1">
              <Wallet size={13} /> Tổng nợ phải trả
            </div>
            <p className="text-lg font-semibold text-hp-text">{congNo.tongNoPhaiTra.toLocaleString("vi-VN")} đ</p>
          </div>
          <div className="bg-hp-surface rounded-hp-md p-3 border border-hp-border">
            <div className="flex items-center gap-1.5 text-xs text-hp-text-muted mb-1">
              <AlertTriangle size={13} /> Nợ quá hạn
            </div>
            <p className="text-lg font-semibold text-hp-danger">{congNo.noQuaHan.toLocaleString("vi-VN")} đ</p>
          </div>
          <div className="bg-hp-surface rounded-hp-md p-3 border border-hp-border">
            <div className="flex items-center gap-1.5 text-xs text-hp-text-muted mb-1">
              <CheckCircle2 size={13} /> Đã thanh toán (30 ngày gần đây)
            </div>
            <p className="text-lg font-semibold text-hp-success">{congNo.daThanhToan30Ngay.toLocaleString("vi-VN")} đ</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={() => setShowModal(true)} className="hp-btn-primary gap-1.5">
          <Plus size={14} /> Thêm nhà cung cấp
        </button>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hp-text-muted" />
          <input className="hp-input w-full pl-8" placeholder="Tìm mã, tên nhà cung cấp..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={load} className="hp-btn-ghost">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="border border-hp-border rounded-hp-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-hp-surface text-hp-text-muted text-xs border-b border-hp-border">
              <th className="px-4 py-2.5 text-left w-24">Mã NCC</th>
              <th className="px-4 py-2.5 text-left">Tên nhà cung cấp</th>
              <th className="px-4 py-2.5 text-left">Địa chỉ</th>
              <th className="px-4 py-2.5 text-left w-32">Người liên hệ</th>
              <th className="px-4 py-2.5 text-left w-28">SĐT</th>
              <th className="px-4 py-2.5 text-right w-32">Còn nợ</th>
              <th className="px-4 py-2.5 text-center w-16">Sửa</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <RefreshCw size={20} className="animate-spin mx-auto text-hp-text-muted" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-hp-text-muted text-sm">
                  Chưa có nhà cung cấp nào
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const conNo = conNoByMa.get(item.ma) || 0;
                return (
                  <tr key={item.ma} onClick={() => setEditItem(item)} className="border-t border-hp-border hover:bg-hp-surface/50 cursor-pointer transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-hp-primary">{item.ma}</td>
                    <td className="px-4 py-2.5 text-hp-text">{item.ten}</td>
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.diaChi || "—"}</td>
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.nguoiLienHe || "—"}</td>
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.sdt || "—"}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${conNo > 0 ? "text-hp-danger" : "text-hp-text-muted"}`}>{conNo.toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Edit2 size={13} className="mx-auto text-hp-text-muted hover:text-hp-primary transition-colors" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-hp-text-muted">
        Tổng số: {items.length} nhà cung cấp — <span className="text-hp-primary">Click vào dòng để sửa</span>
      </div>

      {showModal && (
        <NhaCungCapModal
          item={null}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
      {editItem && (
        <NhaCungCapModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            load();
          }}
        />
      )}
    </div>
  );
}
