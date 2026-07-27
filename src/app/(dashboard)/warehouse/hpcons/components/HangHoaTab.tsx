"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight, X, Save, Edit2 } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { HangHoaRow, KhoRow } from "./types";

function HangHoaModal({
  item,
  khoId,
  khoList,
  onClose,
  onSaved,
}: {
  item: HangHoaRow | null;
  khoId: string;
  khoList: KhoRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    kho_id: item?.khoId || khoId || khoList[0]?.maKho || "",
    ma_hang: item?.maHang || "",
    ten_hang: item?.tenHang || "",
    don_vi_tinh: item?.donViTinh || "",
    nhom_hang: item?.nhomHang || "",
    gia_nhap: item?.giaNhap ?? 0,
    gia_ban: item?.giaBan ?? 0,
    mo_ta: item?.moTa || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.kho_id) return setErr("Vui lòng chọn kho");
    if (!form.ma_hang || !form.ten_hang) return setErr("Vui lòng nhập mã hàng và tên hàng");
    setSaving(true);
    setErr(null);
    try {
      if (isEdit) {
        await api.put(`/warehouse/hang-hoa/${item.id || `${item.khoId}_${item.maHang}`}`, form);
      } else {
        await api.post("/warehouse/hang-hoa", form);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : isEdit ? "Lỗi cập nhật hàng hóa" : "Lỗi tạo hàng hóa");
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
            <span className="font-semibold text-hp-text">{isEdit ? `Sửa hàng hóa — ${item.maHang}` : "Thêm hàng hóa mới"}</span>
          </div>
          <button onClick={onClose} className="hp-btn-ghost p-1">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Kho *</label>
            <select className="hp-input w-full" value={form.kho_id} onChange={(e) => set("kho_id", e.target.value)} disabled={isEdit}>
              <option value="">-- Chọn kho --</option>
              {khoList.map((k) => (
                <option key={k.maKho} value={k.maKho}>
                  {k.tenKho}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Mã hàng *</label>
              <input className="hp-input w-full" value={form.ma_hang} onChange={(e) => set("ma_hang", e.target.value)} placeholder="VPP00001" readOnly={isEdit} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">ĐVT</label>
              <input className="hp-input w-full" value={form.don_vi_tinh} onChange={(e) => set("don_vi_tinh", e.target.value)} placeholder="Cái, Kg, m..." />
            </div>
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Tên hàng *</label>
            <input className="hp-input w-full" value={form.ten_hang} onChange={(e) => set("ten_hang", e.target.value)} placeholder="Tên hàng hóa" />
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Nhóm hàng</label>
            <input className="hp-input w-full" value={form.nhom_hang} onChange={(e) => set("nhom_hang", e.target.value)} placeholder="Văn phòng phẩm, Vật tư..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Giá nhập</label>
              <input type="number" className="hp-input w-full" value={form.gia_nhap} onChange={(e) => set("gia_nhap", Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Giá bán</label>
              <input type="number" className="hp-input w-full" value={form.gia_ban} onChange={(e) => set("gia_ban", Number(e.target.value))} />
            </div>
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

export function HangHoaTab({ khoId = "", khoList = [] }: { khoId?: string; khoList?: KhoRow[] }) {
  const [items, setItems] = useState<HangHoaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<HangHoaRow | null>(null);
  const limit = 50;
  const showKhoCol = !khoId;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), active: "true" });
      if (search) params.set("search", search);
      if (khoId) params.set("kho_id", khoId);
      const res = await api.get<{ items: HangHoaRow[]; total: number }>(`/warehouse/hang-hoa?${params}`);
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setShowModal(true)} className="hp-btn-primary gap-1.5">
          <Plus size={14} /> Thêm hàng hóa
        </button>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hp-text-muted" />
          <input
            className="hp-input w-full pl-8"
            placeholder="Tìm mã hàng, tên hàng..."
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

      <div className="border border-hp-border rounded-hp-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-hp-surface text-hp-text-muted text-xs border-b border-hp-border">
              <th className="px-4 py-2.5 text-left">Mã hàng</th>
              <th className="px-4 py-2.5 text-left">Tên hàng</th>
              {showKhoCol && <th className="px-4 py-2.5 text-left">Kho</th>}
              <th className="px-4 py-2.5 text-left">Nhóm</th>
              <th className="px-4 py-2.5 text-center">ĐVT</th>
              <th className="px-4 py-2.5 text-right">Tồn kho</th>
              <th className="px-4 py-2.5 text-right">Giá nhập</th>
              <th className="px-4 py-2.5 text-right">Giá bán</th>
              <th className="px-4 py-2.5 text-center w-16">Sửa</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={showKhoCol ? 8 : 7} className="py-12 text-center">
                  <RefreshCw size={20} className="animate-spin mx-auto text-hp-text-muted" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={showKhoCol ? 8 : 7} className="py-12 text-center text-hp-text-muted text-sm">
                  Chưa có hàng hóa nào{khoId ? " ở kho này" : ""}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id || `${item.khoId}_${item.maHang}`} onClick={() => setEditItem(item)} className="border-t border-hp-border hover:bg-hp-surface/50 cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-hp-primary">{item.maHang}</td>
                  <td className="px-4 py-2.5 text-hp-text">{item.tenHang}</td>
                  {showKhoCol && <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.kho?.tenKho || item.khoId || "—"}</td>}
                  <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.nhomHang || "—"}</td>
                  <td className="px-4 py-2.5 text-center text-hp-text-muted text-xs">{item.donViTinh || "—"}</td>
                  <td className="px-4 py-2.5 text-right text-hp-text">{item.tonKho ?? 0}</td>
                  <td className="px-4 py-2.5 text-right text-hp-text">{(item.giaNhap || 0).toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-2.5 text-right text-hp-text">{(item.giaBan || 0).toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Edit2 size={13} className="mx-auto text-hp-text-muted hover:text-hp-primary transition-colors" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-hp-text-muted">
        <span>
          Tổng số: {total} mặt hàng — <span className="text-hp-primary">Click vào dòng để sửa</span>
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="hp-btn-ghost p-1 disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="hp-btn-ghost p-1 disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <HangHoaModal
          item={null}
          khoId={khoId}
          khoList={khoList}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
      {editItem && (
        <HangHoaModal
          item={editItem}
          khoId={khoId}
          khoList={khoList}
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
