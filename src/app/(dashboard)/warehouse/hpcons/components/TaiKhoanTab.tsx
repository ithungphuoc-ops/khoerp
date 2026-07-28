"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, RefreshCw, X, Save, Edit2 } from "lucide-react";
import { api } from "@/lib/apiClient";

interface TaiKhoanRow {
  ma: string;
  ten: string;
  moTa?: string;
  active: boolean;
  createdAt: string;
}

function TaiKhoanModal({ item, onClose, onSaved }: { item: TaiKhoanRow | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!item;
  const [form, setForm] = useState({ ma: item?.ma || "", ten: item?.ten || "", mo_ta: item?.moTa || "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.ma || !form.ten) return setErr("Vui lòng nhập mã và tên tài khoản");
    setSaving(true);
    setErr(null);
    try {
      if (isEdit) {
        await api.put(`/warehouse/tai-khoan/${item.ma}`, form);
      } else {
        await api.post("/warehouse/tai-khoan", form);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : isEdit ? "Lỗi cập nhật tài khoản" : "Lỗi tạo tài khoản");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border">
          <div className="flex items-center gap-2">
            {isEdit && <Edit2 size={14} className="text-hp-primary" />}
            <span className="font-semibold text-hp-text">{isEdit ? `Sửa tài khoản — ${item.ma}` : "Thêm tài khoản kế toán"}</span>
          </div>
          <button onClick={onClose} className="hp-btn-ghost p-1">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Mã tài khoản *</label>
            <input className="hp-input w-full" value={form.ma} onChange={(e) => set("ma", e.target.value)} placeholder="152" readOnly={isEdit} />
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Tên tài khoản *</label>
            <input className="hp-input w-full" value={form.ten} onChange={(e) => set("ten", e.target.value)} placeholder="Nguyên vật liệu" />
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Mô tả</label>
            <textarea className="hp-input w-full" rows={2} value={form.mo_ta} onChange={(e) => set("mo_ta", e.target.value)} />
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

export function TaiKhoanTab() {
  const [items, setItems] = useState<TaiKhoanRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<TaiKhoanRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await api.get<{ items: TaiKhoanRow[] }>(`/warehouse/tai-khoan?${params}`);
      setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setShowModal(true)} className="hp-btn-primary gap-1.5">
          <Plus size={14} /> Thêm tài khoản
        </button>
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hp-text-muted" />
          <input className="hp-input w-full pl-8" placeholder="Tìm mã, tên tài khoản..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={load} className="hp-btn-ghost">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="border border-hp-border rounded-hp-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-hp-surface text-hp-text-muted text-xs border-b border-hp-border">
              <th className="px-4 py-2.5 text-left w-24">Mã</th>
              <th className="px-4 py-2.5 text-left">Tên tài khoản</th>
              <th className="px-4 py-2.5 text-left">Mô tả</th>
              <th className="px-4 py-2.5 text-center w-16">Sửa</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <RefreshCw size={20} className="animate-spin mx-auto text-hp-text-muted" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-hp-text-muted text-sm">
                  Chưa có tài khoản kế toán nào
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.ma} onClick={() => setEditItem(item)} className="border-t border-hp-border hover:bg-hp-surface/50 cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-hp-primary">{item.ma}</td>
                  <td className="px-4 py-2.5 text-hp-text">{item.ten}</td>
                  <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.moTa || "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Edit2 size={13} className="mx-auto text-hp-text-muted hover:text-hp-primary transition-colors" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-hp-text-muted">
        Tổng số: {items.length} tài khoản — <span className="text-hp-primary">Click vào dòng để sửa</span>
      </div>

      {showModal && (
        <TaiKhoanModal
          item={null}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
      {editItem && (
        <TaiKhoanModal
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
