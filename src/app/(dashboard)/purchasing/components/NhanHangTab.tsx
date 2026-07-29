"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, RefreshCw, Trash2, X, Save, PackageCheck, AlertTriangle } from "lucide-react";
import { api } from "@/lib/apiClient";

interface DonHangSearchRow {
  soChungTu: string;
  tenNCC?: string;
  maNCC: string;
  trangThai: string;
}

interface ChiTietDonRow {
  maHang?: string;
  tenHang: string;
  donViTinh?: string;
  soLuongDat: number;
  soLuongDaNhan: number;
}

interface DonHangDetail {
  soChungTu: string;
  tenNCC?: string;
  maNCC: string;
  trangThai: string;
  chiTiet: ChiTietDonRow[];
}

interface ChiTietNhanRow {
  stt: number;
  maHang?: string;
  tenHang: string;
  donViTinh?: string;
  soLuongDat: number;
  soLuongNhan: number;
  ghiChu?: string;
}

interface PhieuNhanListItem {
  soChungTu: string;
  donMuaHangId: string;
  ngayNhan: string;
  nguoiNhan?: string;
  chiTiet: ChiTietNhanRow[];
  ghiChu?: string;
}

/** Ô tìm-chọn Đơn mua hàng để nhận hàng — chỉ gợi ý các đơn CHƯA "Hủy"/"Nhận đủ". */
function DonHangSearchSelect({ onSelect }: { onSelect: (soChungTu: string) => void }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggs] = useState<DonHangSearchRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function search(q: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (q) params.set("search", q);
      const res = await api.get<{ items: DonHangSearchRow[] }>(`/purchasing/don-hang?${params}`);
      const items = (res.items || []).filter((d) => d.trangThai !== "huy" && d.trangThai !== "nhan_du");
      setSuggs(items);
      setOpen(true);
    } catch {
      setSuggs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        className="hp-input w-full"
        placeholder="Gõ số đơn hoặc tên NCC..."
        value={query}
        onFocus={() => search(query)}
        onChange={(e) => {
          setQuery(e.target.value);
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => search(e.target.value), 250);
        }}
      />
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="w-3 h-3 border border-hp-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-hp-bg border border-hp-border rounded-hp-md shadow-xl max-h-52 overflow-auto">
          {suggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-hp-text-muted">Không có đơn nào chưa nhận đủ</div>
          ) : (
            suggestions.map((d) => (
              <div
                key={d.soChungTu}
                onMouseDown={() => {
                  onSelect(d.soChungTu);
                  setQuery(`${d.soChungTu} — ${d.tenNCC || d.maNCC}`);
                  setOpen(false);
                }}
                className="px-3 py-2 cursor-pointer hover:bg-hp-surface text-sm flex items-center gap-2"
              >
                <span className="font-mono text-xs text-hp-primary">{d.soChungTu}</span>
                <span className="text-hp-text truncate">{d.tenNCC || d.maNCC}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NhanHangModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [don, setDon] = useState<DonHangDetail | null>(null);
  const [rows, setRows] = useState<ChiTietNhanRow[]>([]);
  const [ngayNhan, setNgayNhan] = useState(today);
  const [nguoiNhan, setNguoiNhan] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSelectDon(soChungTu: string) {
    setErr(null);
    try {
      const detail = await api.get<DonHangDetail>(`/purchasing/don-hang/${soChungTu}`);
      setDon(detail);
      setRows(
        detail.chiTiet.map((ct, i) => ({
          stt: i + 1,
          maHang: ct.maHang,
          tenHang: ct.tenHang,
          donViTinh: ct.donViTinh,
          soLuongDat: ct.soLuongDat,
          soLuongNhan: Math.max(0, ct.soLuongDat - ct.soLuongDaNhan),
        }))
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải đơn mua hàng");
    }
  }

  function updateSoLuong(i: number, v: number) {
    setRows((prev) => {
      const r = [...prev];
      r[i] = { ...r[i], soLuongNhan: v };
      return r;
    });
  }

  async function handleSave() {
    if (!don) return setErr("Vui lòng chọn đơn mua hàng");
    if (!ngayNhan) return setErr("Vui lòng chọn ngày nhận");
    const chiTiet = rows.filter((r) => r.soLuongNhan > 0).map((r) => ({ stt: r.stt, so_luong_nhan: r.soLuongNhan }));
    if (chiTiet.length === 0) return setErr("Vui lòng nhập số lượng nhận cho ít nhất 1 dòng hàng");
    setSaving(true);
    setErr(null);
    try {
      await api.post("/purchasing/nhan-hang", {
        don_mua_hang_id: don.soChungTu,
        ngay_nhan: ngayNhan,
        nguoi_nhan: nguoiNhan || undefined,
        ghi_chu: ghiChu || undefined,
        chi_tiet: chiTiet,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tạo phiếu nhận hàng");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border">
          <div className="flex items-center gap-2">
            <PackageCheck size={16} className="text-hp-primary" />
            <span className="font-semibold text-hp-text">Tạo phiếu nhận hàng</span>
          </div>
          <button onClick={onClose} className="hp-btn-ghost p-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Đơn mua hàng *</label>
            <DonHangSearchSelect onSelect={handleSelectDon} />
          </div>

          {don && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-hp-text-muted mb-1 block">Ngày nhận *</label>
                  <input type="date" className="hp-input w-full" value={ngayNhan} onChange={(e) => setNgayNhan(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-hp-text-muted mb-1 block">Người nhận</label>
                  <input className="hp-input w-full" value={nguoiNhan} onChange={(e) => setNguoiNhan(e.target.value)} />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-hp-text-muted mb-2 uppercase tracking-wide">Hàng hóa còn phải giao</p>
                <div className="border border-hp-border rounded-hp-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-hp-surface text-hp-text-muted text-xs">
                        <th className="px-2 py-2 text-left">Tên hàng</th>
                        <th className="px-2 py-2 text-center w-14">ĐVT</th>
                        <th className="px-2 py-2 text-right w-16">SL đặt</th>
                        <th className="px-2 py-2 text-right w-16">Còn lại</th>
                        <th className="px-2 py-2 text-right w-24">SL nhận lần này</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => {
                        const conLai = don.chiTiet[i]?.soLuongDat - don.chiTiet[i]?.soLuongDaNhan;
                        const daDuDong = conLai <= 0;
                        return (
                          <tr key={i} className={`border-t border-hp-border ${daDuDong ? "opacity-40" : ""}`}>
                            <td className="px-2 py-1.5 text-hp-text">{row.tenHang}</td>
                            <td className="px-2 py-1.5 text-center text-hp-text-muted">{row.donViTinh || "—"}</td>
                            <td className="px-2 py-1.5 text-right text-hp-text-muted">{row.soLuongDat}</td>
                            <td className="px-2 py-1.5 text-right text-hp-text-muted">{conLai}</td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                disabled={daDuDong}
                                className="hp-input w-full py-0.5 text-right"
                                value={row.soLuongNhan}
                                onChange={(e) => updateSoLuong(i, Number(e.target.value))}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="text-xs text-hp-text-muted mb-1 block">Ghi chú</label>
                <textarea className="hp-input w-full" rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
              </div>
            </>
          )}

          {err && <p className="text-xs text-hp-danger">{err}</p>}
        </div>

        <div className="px-5 py-3 border-t border-hp-border flex justify-between">
          <button onClick={onClose} className="hp-btn-secondary">
            Hủy
          </button>
          <button onClick={handleSave} disabled={saving || !don} className="hp-btn-primary gap-1.5">
            <Save size={14} /> {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function NhanHangTab() {
  const [items, setItems] = useState<PhieuNhanListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<PhieuNhanListItem | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: PhieuNhanListItem[] }>("/purchasing/nhan-hang?limit=50");
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
    if (!selected) return;
    setDeleting(true);
    try {
      await api.delete(`/purchasing/nhan-hang/${selected.soChungTu}`);
      setSelected(null);
      setConfirmDel(false);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col border-b border-hp-border" style={{ minHeight: 0, flex: "0 0 auto", maxHeight: "55%" }}>
        <div className="flex items-center gap-2 flex-wrap px-4 py-3">
          <button onClick={() => setShowCreate(true)} className="hp-btn-primary gap-1.5 text-sm">
            <Plus size={14} /> Tạo phiếu nhận hàng
          </button>
          <button onClick={load} className="hp-btn-ghost ml-auto">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-hp-surface text-hp-text-muted text-xs border-b border-hp-border">
                <th className="px-4 py-2.5 text-left">Ngày nhận</th>
                <th className="px-4 py-2.5 text-left">Số phiếu</th>
                <th className="px-4 py-2.5 text-left">Đơn mua hàng</th>
                <th className="px-4 py-2.5 text-left">Người nhận</th>
                <th className="px-4 py-2.5 text-right">Số dòng hàng</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-hp-text-muted">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-1" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-hp-text-muted text-sm">
                    Chưa có phiếu nhận hàng nào
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.soChungTu}
                    onClick={() => setSelected(item)}
                    className={`border-t border-hp-border hover:bg-hp-surface/50 cursor-pointer transition-colors ${
                      selected?.soChungTu === item.soChungTu ? "bg-hp-primary/5 border-l-2 border-l-hp-primary" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{new Date(item.ngayNhan).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-2.5 font-medium text-hp-primary">{item.soChungTu}</td>
                    <td className="px-4 py-2.5 text-hp-text">{item.donMuaHangId}</td>
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.nguoiNhan || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-hp-text">{item.chiTiet.length}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-hp-text-muted gap-3">
            <PackageCheck size={32} className="opacity-30" />
            <p className="text-sm">Chọn phiếu nhận hàng để xem chi tiết</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-hp-border bg-hp-surface/50">
              <div className="flex items-center gap-2">
                <PackageCheck size={14} className="text-hp-primary" />
                <span className="text-sm font-semibold text-hp-text">Phiếu nhận hàng — {selected.soChungTu}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setConfirmDel(true)} className="hp-btn-ghost px-2 py-1 text-xs gap-1 text-hp-danger">
                  <Trash2 size={12} /> Xóa
                </button>
                <button onClick={() => setSelected(null)} className="hp-btn-ghost p-1 text-hp-text-muted hover:text-hp-text">
                  <X size={14} />
                </button>
              </div>
            </div>

            {confirmDel && (
              <div className="mx-4 mt-3 flex items-center gap-3 bg-hp-danger/10 border border-hp-danger/30 rounded-hp-md px-4 py-3">
                <AlertTriangle size={16} className="text-hp-danger shrink-0" />
                <span className="text-sm text-hp-danger flex-1">
                  Xóa phiếu <strong>{selected.soChungTu}</strong>? Số lượng đã nhận trên đơn mua hàng gốc sẽ được hoàn nguyên.
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
                  { label: "Đơn mua hàng", value: selected.donMuaHangId },
                  { label: "Ngày nhận", value: new Date(selected.ngayNhan).toLocaleDateString("vi-VN") },
                  { label: "Người nhận", value: selected.nguoiNhan || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-hp-surface rounded-hp-md p-3">
                    <p className="text-xs text-hp-text-muted mb-0.5">{label}</p>
                    <p className="text-hp-text font-medium">{value}</p>
                  </div>
                ))}
              </div>

              <div className="border border-hp-border rounded-hp-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-hp-surface text-hp-text-muted text-xs">
                      <th className="px-3 py-2 text-left w-8">#</th>
                      <th className="px-3 py-2 text-left">Tên hàng</th>
                      <th className="px-3 py-2 text-center w-14">ĐVT</th>
                      <th className="px-3 py-2 text-right w-16">SL đặt</th>
                      <th className="px-3 py-2 text-right w-20">SL nhận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.chiTiet.map((row, i) => (
                      <tr key={i} className="border-t border-hp-border">
                        <td className="px-3 py-1.5 text-hp-text-muted text-xs">{i + 1}</td>
                        <td className="px-3 py-1.5 text-hp-text">{row.tenHang}</td>
                        <td className="px-3 py-1.5 text-center text-hp-text-muted">{row.donViTinh || "—"}</td>
                        <td className="px-3 py-1.5 text-right text-hp-text-muted">{row.soLuongDat}</td>
                        <td className="px-3 py-1.5 text-right text-hp-text font-medium">{row.soLuongNhan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.ghiChu && (
                <div>
                  <p className="text-xs text-hp-text-muted mb-1">Ghi chú</p>
                  <p className="text-sm text-hp-text bg-hp-surface rounded-hp-md px-3 py-2">{selected.ghiChu}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <NhanHangModal
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
