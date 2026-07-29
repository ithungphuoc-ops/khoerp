"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, RefreshCw, Trash2, X, Save, Wallet, AlertTriangle } from "lucide-react";
import { api } from "@/lib/apiClient";
import { EntityAutocomplete } from "@/components/EntityAutocomplete";
import type { HinhThucThanhToan } from "@/lib/types/purchasing";

const HINH_THUC_LABEL: Record<HinhThucThanhToan, string> = { tien_mat: "Tiền mặt", chuyen_khoan: "Chuyển khoản" };

interface DonHangSearchRow {
  soChungTu: string;
  tongTienThanhToan: number;
}

interface ThanhToanRow {
  soChungTu: string;
  maNCC: string;
  tenNCC?: string;
  donMuaHangId?: string;
  soTien: number;
  ngayThanhToan: string;
  hinhThuc?: HinhThucThanhToan;
  ghiChu?: string;
}

/** Ô tìm-chọn Đơn mua hàng (tùy chọn) để gắn phiếu thanh toán — lọc theo NCC đã chọn. */
function DonHangByNCCSelect({ maNCC, value, onSelect }: { maNCC: string; value: string; onSelect: (soChungTu: string) => void }) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggs] = useState<DonHangSearchRow[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);
  useEffect(() => {
    function h(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function search() {
    if (!maNCC) return;
    try {
      const res = await api.get<{ items: DonHangSearchRow[] }>(`/purchasing/don-hang?ma_ncc=${encodeURIComponent(maNCC)}&limit=50`);
      setSuggs(res.items || []);
      setOpen(true);
    } catch {
      setSuggs([]);
    }
  }

  if (!maNCC) {
    return <input className="hp-input w-full" placeholder="Chọn nhà cung cấp trước" disabled />;
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <input className="hp-input w-full" placeholder="-- Không gắn đơn cụ thể --" value={query} onFocus={search} readOnly />
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-hp-bg border border-hp-border rounded-hp-md shadow-xl max-h-52 overflow-auto">
          <div
            onMouseDown={() => {
              onSelect("");
              setQuery("");
              setOpen(false);
            }}
            className="px-3 py-2 cursor-pointer hover:bg-hp-surface text-sm text-hp-text-muted italic"
          >
            -- Không gắn đơn cụ thể (thanh toán chung) --
          </div>
          {suggestions.map((d) => (
            <div
              key={d.soChungTu}
              onMouseDown={() => {
                onSelect(d.soChungTu);
                setQuery(d.soChungTu);
                setOpen(false);
              }}
              className="px-3 py-2 cursor-pointer hover:bg-hp-surface text-sm flex items-center justify-between gap-2"
            >
              <span className="font-mono text-xs text-hp-primary">{d.soChungTu}</span>
              <span className="text-hp-text-muted text-xs">{d.tongTienThanhToan.toLocaleString("vi-VN")} đ</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThanhToanModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    ma_ncc: "",
    ten_ncc: "",
    don_mua_hang_id: "",
    so_tien: 0,
    ngay_thanh_toan: today,
    hinh_thuc: "chuyen_khoan" as HinhThucThanhToan,
    ghi_chu: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.ma_ncc) return setErr("Vui lòng chọn nhà cung cấp");
    if (!form.so_tien || form.so_tien <= 0) return setErr("Số tiền phải lớn hơn 0");
    if (!form.ngay_thanh_toan) return setErr("Vui lòng chọn ngày thanh toán");
    setSaving(true);
    setErr(null);
    try {
      await api.post("/purchasing/thanh-toan", {
        ma_ncc: form.ma_ncc,
        ten_ncc: form.ten_ncc,
        don_mua_hang_id: form.don_mua_hang_id || undefined,
        so_tien: form.so_tien,
        ngay_thanh_toan: form.ngay_thanh_toan,
        hinh_thuc: form.hinh_thuc,
        ghi_chu: form.ghi_chu || undefined,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tạo phiếu thanh toán");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border">
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-hp-primary" />
            <span className="font-semibold text-hp-text">Tạo phiếu thanh toán</span>
          </div>
          <button onClick={onClose} className="hp-btn-ghost p-1">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Nhà cung cấp *</label>
            <EntityAutocomplete
              apiPath="/purchasing/ncc"
              value={form.ten_ncc}
              placeholder="Gõ tên/mã NCC..."
              onChange={(row) => {
                set("ma_ncc", row.ma);
                set("ten_ncc", row.ten);
                set("don_mua_hang_id", "");
              }}
              onTextChange={(v) => set("ten_ncc", v)}
            />
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Gắn đơn mua hàng (tùy chọn)</label>
            <DonHangByNCCSelect maNCC={form.ma_ncc} value={form.don_mua_hang_id} onSelect={(v) => set("don_mua_hang_id", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Số tiền *</label>
              <input type="number" className="hp-input w-full" value={form.so_tien} onChange={(e) => set("so_tien", Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Ngày thanh toán *</label>
              <input type="date" className="hp-input w-full" value={form.ngay_thanh_toan} onChange={(e) => set("ngay_thanh_toan", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Hình thức</label>
            <select className="hp-input w-full" value={form.hinh_thuc} onChange={(e) => set("hinh_thuc", e.target.value as HinhThucThanhToan)}>
              <option value="chuyen_khoan">Chuyển khoản</option>
              <option value="tien_mat">Tiền mặt</option>
            </select>
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
            <Save size={14} /> {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ThanhToanTab() {
  const [items, setItems] = useState<ThanhToanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDel, setConfirmDel] = useState<ThanhToanRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: ThanhToanRow[] }>("/purchasing/thanh-toan?limit=50");
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await api.delete(`/purchasing/thanh-toan/${confirmDel.soChungTu}`);
      setConfirmDel(null);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setShowCreate(true)} className="hp-btn-primary gap-1.5">
          <Plus size={14} /> Tạo phiếu thanh toán
        </button>
        <button onClick={load} className="hp-btn-ghost ml-auto">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="border border-hp-border rounded-hp-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-hp-surface text-hp-text-muted text-xs border-b border-hp-border">
              <th className="px-4 py-2.5 text-left">Ngày</th>
              <th className="px-4 py-2.5 text-left">Số phiếu</th>
              <th className="px-4 py-2.5 text-left">Nhà cung cấp</th>
              <th className="px-4 py-2.5 text-left">Đơn mua hàng</th>
              <th className="px-4 py-2.5 text-left">Hình thức</th>
              <th className="px-4 py-2.5 text-right">Số tiền</th>
              <th className="px-4 py-2.5 text-center w-14">Xóa</th>
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
                  Chưa có phiếu thanh toán nào
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.soChungTu} className="border-t border-hp-border hover:bg-hp-surface/50">
                  <td className="px-4 py-2.5 text-hp-text-muted text-xs">{new Date(item.ngayThanhToan).toLocaleDateString("vi-VN")}</td>
                  <td className="px-4 py-2.5 font-medium text-hp-primary">{item.soChungTu}</td>
                  <td className="px-4 py-2.5 text-hp-text">{item.tenNCC || item.maNCC}</td>
                  <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.donMuaHangId || "—"}</td>
                  <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.hinhThuc ? HINH_THUC_LABEL[item.hinhThuc] : "—"}</td>
                  <td className="px-4 py-2.5 text-right text-hp-text font-medium">{item.soTien.toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => setConfirmDel(item)} className="text-hp-text-muted hover:text-hp-danger">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-sm p-4 shadow-2xl">
            <div className="flex items-center gap-2 text-hp-danger mb-3">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">Xóa phiếu thanh toán {confirmDel.soChungTu}?</span>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)} className="hp-btn-secondary text-xs">
                Hủy
              </button>
              <button onClick={handleDelete} disabled={deleting} className="bg-hp-danger text-white text-xs px-3 py-1.5 rounded-hp-md hover:opacity-90 disabled:opacity-50">
                {deleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <ThanhToanModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}
