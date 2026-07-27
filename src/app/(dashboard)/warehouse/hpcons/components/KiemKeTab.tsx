"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, RefreshCw, X, Save, Trash2, ChevronLeft, ChevronRight, ClipboardCheck, AlertTriangle, Package } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { KhoRow, HangHoaRow } from "./types";

interface ChiTietKiemKeRow {
  stt: number;
  hangHoaId: string;
  maHang: string;
  tenHang: string;
  donViTinh?: string;
  soLuongHeThong: number;
  soLuongThucTe: number;
  chenhLech: number;
  ghiChu?: string;
}

interface PhieuKiemKeListItem {
  soChungTu: string;
  ngayKiemKe: string;
  nguoiKiemKe?: string;
  lyDo?: string;
  trangThai: string;
  soDongChenhLech: number;
  kho: { maKho: string; tenKho: string } | null;
}

interface PhieuKiemKeDetail {
  soChungTu: string;
  ngayKiemKe: string;
  khoId: string;
  nguoiKiemKe?: string;
  lyDo?: string;
  ghiChu?: string;
  trangThai: string;
  chiTiet: ChiTietKiemKeRow[] | null;
  kho: { maKho: string; tenKho: string } | null;
}

function KiemKeModal({ khoList, onClose, onSaved }: { khoList: KhoRow[]; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [khoId, setKhoId] = useState(khoList[0]?.maKho || "");
  const [ngayKiemKe, setNgayKiemKe] = useState(today);
  const [nguoiKiemKe, setNguoiKiemKe] = useState("");
  const [lyDo, setLyDo] = useState("Kiểm kê định kỳ");
  const [ghiChu, setGhiChu] = useState("");
  const [rows, setRows] = useState<ChiTietKiemKeRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!khoId) return;
    setLoadingRows(true);
    try {
      const res = await api.get<{ items: HangHoaRow[] }>(`/warehouse/hang-hoa?kho_id=${encodeURIComponent(khoId)}&active=true&limit=200`);
      const items = res.items || [];
      setRows(
        items.map((h, i) => ({
          stt: i + 1,
          hangHoaId: h.maHang,
          maHang: h.maHang,
          tenHang: h.tenHang,
          donViTinh: h.donViTinh,
          soLuongHeThong: h.tonKho ?? 0,
          soLuongThucTe: h.tonKho ?? 0,
          chenhLech: 0,
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRows(false);
    }
  }, [khoId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function updateThucTe(i: number, v: number) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], soLuongThucTe: v, chenhLech: v - next[i].soLuongHeThong };
      return next;
    });
  }

  const soDongChenhLech = rows.filter((r) => r.chenhLech !== 0).length;

  async function handleSave() {
    if (!khoId) return setErr("Vui lòng chọn kho");
    if (rows.length === 0) return setErr("Kho này chưa có hàng hóa nào để kiểm kê");
    setSaving(true);
    setErr(null);
    try {
      const chi_tiet = rows.map((r) => ({
        hang_hoa_id: r.hangHoaId,
        ma_hang: r.maHang,
        ten_hang: r.tenHang,
        don_vi_tinh: r.donViTinh,
        so_luong_he_thong: r.soLuongHeThong,
        so_luong_thuc_te: r.soLuongThucTe,
        ghi_chu: r.ghiChu,
      }));
      await api.post("/warehouse/kiem-ke", {
        kho_id: khoId,
        ngay_kiem_ke: ngayKiemKe,
        nguoi_kiem_ke: nguoiKiemKe,
        ly_do: lyDo,
        ghi_chu: ghiChu,
        chi_tiet,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi lưu phiếu kiểm kê");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-hp-accent" />
            <span className="font-semibold text-hp-text">Tạo phiếu kiểm kê</span>
          </div>
          <button onClick={onClose} className="hp-btn-ghost p-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Kho kiểm kê *</label>
              <select className="hp-input w-full" value={khoId} onChange={(e) => setKhoId(e.target.value)}>
                <option value="">-- Chọn kho --</option>
                {khoList.map((k) => (
                  <option key={k.maKho} value={k.maKho}>
                    {k.tenKho}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Ngày kiểm kê</label>
              <input type="date" className="hp-input w-full" value={ngayKiemKe} onChange={(e) => setNgayKiemKe(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Người kiểm kê</label>
              <input className="hp-input w-full" value={nguoiKiemKe} onChange={(e) => setNguoiKiemKe(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Lý do</label>
              <input className="hp-input w-full" value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-hp-text-muted uppercase tracking-wide">Đếm thực tế ({rows.length} mặt hàng)</p>
              {soDongChenhLech > 0 && (
                <span className="flex items-center gap-1 text-xs text-hp-warning">
                  <AlertTriangle size={12} /> {soDongChenhLech} dòng có chênh lệch
                </span>
              )}
            </div>
            <div className="border border-hp-border rounded-hp-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-hp-surface text-hp-text-muted text-xs">
                    <th className="px-2 py-2 text-left w-10">#</th>
                    <th className="px-2 py-2 text-left w-28">Mã hàng</th>
                    <th className="px-2 py-2 text-left">Tên hàng</th>
                    <th className="px-2 py-2 text-center w-16">ĐVT</th>
                    <th className="px-2 py-2 text-right w-28">Tồn hệ thống</th>
                    <th className="px-2 py-2 text-right w-28">Đếm thực tế</th>
                    <th className="px-2 py-2 text-right w-24">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRows ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center">
                        <RefreshCw size={18} className="animate-spin mx-auto text-hp-text-muted" />
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-hp-text-muted text-sm">
                        {khoId ? "Kho này chưa có hàng hóa nào" : "Chọn kho để tải danh sách hàng hóa"}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, i) => (
                      <tr key={row.hangHoaId} className="border-t border-hp-border hover:bg-hp-surface/50">
                        <td className="px-2 py-1.5 text-hp-text-muted text-xs">{row.stt}</td>
                        <td className="px-2 py-1.5 font-mono text-xs text-hp-primary">{row.maHang}</td>
                        <td className="px-2 py-1.5 text-hp-text">{row.tenHang}</td>
                        <td className="px-2 py-1.5 text-center text-hp-text-muted text-xs">{row.donViTinh || "—"}</td>
                        <td className="px-2 py-1.5 text-right text-hp-text-muted">{row.soLuongHeThong}</td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            className="hp-input w-full py-0.5 text-right"
                            value={row.soLuongThucTe}
                            onChange={(e) => updateThucTe(i, Number(e.target.value))}
                          />
                        </td>
                        <td className={`px-2 py-1.5 text-right font-medium ${row.chenhLech > 0 ? "text-hp-success" : row.chenhLech < 0 ? "text-hp-danger" : "text-hp-text-muted"}`}>
                          {row.chenhLech > 0 ? `+${row.chenhLech}` : row.chenhLech}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Ghi chú</label>
            <textarea className="hp-input w-full" rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
          </div>
          {err && <p className="text-xs text-hp-danger">{err}</p>}
        </div>

        <div className="px-5 py-3 border-t border-hp-border flex items-center justify-between">
          <button onClick={onClose} className="hp-btn-secondary">
            Hủy
          </button>
          <button onClick={handleSave} disabled={saving || loadingRows} className="hp-btn-primary gap-1.5">
            <Save size={14} /> {saving ? "Đang lưu..." : "Lưu phiếu kiểm kê"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({ phieu, onClose, onDelete }: { phieu: PhieuKiemKeDetail; onClose: () => void; onDelete: () => Promise<void> }) {
  const chiTiet = phieu.chiTiet;
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          <ClipboardCheck size={14} className="text-hp-accent" />
          <span className="text-sm font-semibold text-hp-text">Phiếu kiểm kê — {phieu.soChungTu}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setConfirmDel(true)} className="hp-btn-ghost px-2 py-1 text-xs gap-1 text-hp-danger">
            <Trash2 size={12} /> Xóa
          </button>
          <button onClick={onClose} className="hp-btn-ghost p-1 text-hp-text-muted hover:text-hp-text">
            <X size={14} />
          </button>
        </div>
      </div>

      {confirmDel && (
        <div className="mx-4 mt-3 flex items-center gap-3 bg-hp-danger/10 border border-hp-danger/30 rounded-hp-md px-4 py-3">
          <AlertTriangle size={16} className="text-hp-danger shrink-0" />
          <span className="text-sm text-hp-danger flex-1">
            Xóa phiếu <strong>{phieu.soChungTu}</strong>? Tồn kho sẽ được hoàn về trước khi kiểm kê.
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
            { label: "Kho", value: phieu.kho?.tenKho || phieu.kho?.maKho || "—" },
            { label: "Ngày kiểm kê", value: phieu.ngayKiemKe ? new Date(phieu.ngayKiemKe).toLocaleDateString("vi-VN") : "—" },
            { label: "Người kiểm kê", value: phieu.nguoiKiemKe || "—" },
            { label: "Lý do", value: phieu.lyDo || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-hp-surface rounded-hp-md p-3">
              <p className="text-xs text-hp-text-muted mb-0.5">{label}</p>
              <p className="text-hp-text font-medium">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-hp-text-muted mb-2 uppercase tracking-wide">Chi tiết kiểm kê</p>
          <div className="border border-hp-border rounded-hp-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-hp-surface text-hp-text-muted text-xs">
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left w-24">Mã hàng</th>
                  <th className="px-3 py-2 text-left">Tên hàng</th>
                  <th className="px-3 py-2 text-center w-16">ĐVT</th>
                  <th className="px-3 py-2 text-right w-24">Tồn hệ thống</th>
                  <th className="px-3 py-2 text-right w-24">Thực tế</th>
                  <th className="px-3 py-2 text-right w-20">Chênh lệch</th>
                </tr>
              </thead>
              <tbody>
                {chiTiet === null ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center">
                      <RefreshCw size={14} className="animate-spin mx-auto text-hp-text-muted" />
                    </td>
                  </tr>
                ) : chiTiet.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-hp-text-muted text-xs">
                      Không có dòng hàng
                    </td>
                  </tr>
                ) : (
                  chiTiet.map((row, i) => (
                    <tr key={i} className="border-t border-hp-border hover:bg-hp-surface/50">
                      <td className="px-3 py-1.5 text-hp-text-muted text-xs">{i + 1}</td>
                      <td className="px-3 py-1.5 text-hp-text font-medium">{row.maHang || "—"}</td>
                      <td className="px-3 py-1.5 text-hp-text">{row.tenHang || "—"}</td>
                      <td className="px-3 py-1.5 text-center text-hp-text-muted">{row.donViTinh || "—"}</td>
                      <td className="px-3 py-1.5 text-right text-hp-text-muted">{row.soLuongHeThong}</td>
                      <td className="px-3 py-1.5 text-right text-hp-text">{row.soLuongThucTe}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${row.chenhLech > 0 ? "text-hp-success" : row.chenhLech < 0 ? "text-hp-danger" : "text-hp-text-muted"}`}>
                        {row.chenhLech > 0 ? `+${row.chenhLech}` : row.chenhLech}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {phieu.ghiChu && (
          <div>
            <p className="text-xs text-hp-text-muted mb-1">Ghi chú</p>
            <p className="text-sm text-hp-text bg-hp-surface rounded-hp-md px-3 py-2">{phieu.ghiChu}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function KiemKeTab({ khoId = "", khoList = [] }: { khoId?: string; khoList?: KhoRow[] }) {
  const [items, setItems] = useState<PhieuKiemKeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPhieu, setSelectedPhieu] = useState<PhieuKiemKeDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (khoId) params.set("kho_id", khoId);
      const res = await api.get<{ items: PhieuKiemKeListItem[]; total: number }>(`/warehouse/kiem-ke?${params}`);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, khoId]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(item: PhieuKiemKeListItem) {
    setSelectedPhieu({ ...(item as unknown as PhieuKiemKeDetail), chiTiet: null });
    try {
      const detail = await api.get<PhieuKiemKeDetail>(`/warehouse/kiem-ke/${item.soChungTu}`);
      setSelectedPhieu(detail);
    } catch (e) {
      console.error(e);
      setSelectedPhieu((prev) => (prev ? { ...prev, chiTiet: [] } : prev));
    }
  }

  async function handleDelete() {
    if (!selectedPhieu) return;
    await api.delete(`/warehouse/kiem-ke/${selectedPhieu.soChungTu}`);
    setSelectedPhieu(null);
    load();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col border-b border-hp-border" style={{ minHeight: 0, flex: "0 0 auto", maxHeight: "55%" }}>
        <div className="flex items-center gap-2 flex-wrap px-4 py-3">
          <button onClick={() => setShowCreate(true)} className="hp-btn-primary gap-1.5 text-sm">
            <Plus size={14} /> Tạo phiếu kiểm kê
          </button>
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hp-text-muted" />
            <input
              className="hp-input w-full pl-8"
              placeholder="Tìm số phiếu, lý do..."
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
                <th className="px-4 py-2.5 text-left">Ngày kiểm kê</th>
                <th className="px-4 py-2.5 text-left">Số chứng từ</th>
                <th className="px-4 py-2.5 text-left">Lý do</th>
                <th className="px-4 py-2.5 text-left">Kho</th>
                <th className="px-4 py-2.5 text-left">Người kiểm kê</th>
                <th className="px-4 py-2.5 text-right">Số dòng chênh lệch</th>
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
                    Chưa có phiếu kiểm kê nào
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.soChungTu}
                    onClick={() => openDetail(item)}
                    className={`border-t border-hp-border hover:bg-hp-surface/50 cursor-pointer transition-colors ${
                      selectedPhieu?.soChungTu === item.soChungTu ? "bg-hp-primary/5 border-l-2 border-l-hp-primary" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{new Date(item.ngayKiemKe).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-2.5 font-medium text-hp-accent">{item.soChungTu}</td>
                    <td className="px-4 py-2.5 text-hp-text">{item.lyDo || "—"}</td>
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.kho?.tenKho || item.kho?.maKho || "—"}</td>
                    <td className="px-4 py-2.5 text-hp-text text-xs">{item.nguoiKiemKe || "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      {item.soDongChenhLech > 0 ? <span className="text-hp-warning font-medium">{item.soDongChenhLech}</span> : <span className="text-hp-text-muted">0</span>}
                    </td>
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
        {!selectedPhieu && (
          <div className="flex flex-col items-center justify-center h-full text-hp-text-muted gap-3">
            <Package size={32} className="opacity-30" />
            <p className="text-sm">Chọn phiếu để xem chi tiết</p>
          </div>
        )}
        {selectedPhieu && <DetailPanel phieu={selectedPhieu} onClose={() => setSelectedPhieu(null)} onDelete={handleDelete} />}
      </div>

      {showCreate && (
        <KiemKeModal
          khoList={khoList}
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
