"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw, Pencil, Trash2, X, Save, Warehouse } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { KhoRow } from "./types";

function KhoModal({ kho, onClose, onSaved }: { kho: KhoRow | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!kho;
  const [form, setForm] = useState({
    ma_kho: kho?.maKho || "",
    ten_kho: kho?.tenKho || "",
    dia_chi: kho?.diaChi || "",
    mo_ta: kho?.moTa || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    if (!form.ma_kho || !form.ten_kho) return setErr("Vui lòng nhập mã kho và tên kho");
    setSaving(true);
    setErr(null);
    try {
      if (isEdit) {
        await api.put(`/warehouse/kho/${kho.maKho}`, form);
      } else {
        await api.post("/warehouse/kho", form);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi lưu kho");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border">
          <span className="font-semibold text-hp-text">{isEdit ? "Sửa kho" : "Tạo kho mới"}</span>
          <button onClick={onClose} className="hp-btn-ghost p-1">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Mã kho *</label>
              <input
                className="hp-input w-full"
                value={form.ma_kho}
                readOnly={isEdit}
                onChange={(e) => set("ma_kho", e.target.value.toUpperCase())}
                placeholder="VD: CCDC, VPP, IT..."
              />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Tên kho *</label>
              <input className="hp-input w-full" value={form.ten_kho} onChange={(e) => set("ten_kho", e.target.value)} placeholder="Kho CCDC HP Cons" />
            </div>
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Địa chỉ</label>
            <input className="hp-input w-full" value={form.dia_chi} onChange={(e) => set("dia_chi", e.target.value)} placeholder="Địa chỉ kho" />
          </div>
          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Mô tả</label>
            <textarea className="hp-input w-full" rows={2} value={form.mo_ta} onChange={(e) => set("mo_ta", e.target.value)} placeholder="Ghi chú thêm..." />
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

function ConfirmDeleteModal({ kho, onClose, onConfirm }: { kho: KhoRow; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-sm shadow-2xl p-5">
        <p className="text-hp-text font-semibold mb-2">Xác nhận xóa kho</p>
        <p className="text-sm text-hp-text-muted mb-4">
          Bạn có chắc muốn xóa kho <span className="text-hp-danger font-medium">{kho.tenKho}</span>? Kho sẽ bị ẩn khỏi hệ thống (soft delete).
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="hp-btn-secondary">
            Hủy
          </button>
          <button
            onClick={async () => {
              setDeleting(true);
              await onConfirm();
              setDeleting(false);
            }}
            disabled={deleting}
            className="hp-btn-danger gap-1.5"
          >
            <Trash2 size={14} /> {deleting ? "Đang xóa..." : "Xóa kho"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function KhoTab() {
  const [items, setItems] = useState<KhoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<KhoRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KhoRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: KhoRow[] }>("/warehouse/kho");
      setItems(res.items || []);
    } catch {
      setErr("Không tải được danh sách kho");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(kho: KhoRow) {
    try {
      await api.delete(`/warehouse/kho/${kho.maKho}`);
      setDeleteTarget(null);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi xóa kho");
      setDeleteTarget(null);
    }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setSelected(null);
            setShowModal(true);
          }}
          className="hp-btn-primary gap-1.5"
        >
          <Plus size={14} /> Tạo kho mới
        </button>
        <button onClick={load} className="hp-btn-ghost">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
        <span className="text-xs text-hp-text-muted ml-auto">Tổng: {items.length} kho</span>
      </div>

      {err && <p className="text-xs text-hp-danger">{err}</p>}

      {loading ? (
        <div className="py-12 text-center">
          <RefreshCw size={20} className="animate-spin mx-auto text-hp-text-muted" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-hp-text-muted text-sm">Chưa có kho nào — bấm &quot;Tạo kho mới&quot; để bắt đầu</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((kho) => (
            <div key={kho.maKho} className="bg-hp-surface border border-hp-border rounded-hp-lg p-4 flex flex-col gap-2 hover:border-hp-primary/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Warehouse size={16} className="text-hp-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-hp-text text-sm">{kho.tenKho}</p>
                    <p className="text-xs text-hp-primary font-mono">{kho.maKho}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelected(kho);
                      setShowModal(true);
                    }}
                    className="hp-btn-ghost p-1.5 text-hp-text-muted hover:text-hp-primary"
                    title="Sửa kho"
                  >
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget(kho)} className="hp-btn-ghost p-1.5 text-hp-text-muted hover:text-hp-danger" title="Xóa kho">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {kho.diaChi && <p className="text-xs text-hp-text-muted truncate">📍 {kho.diaChi}</p>}
              {kho.moTa && <p className="text-xs text-hp-text-muted italic line-clamp-2">{kho.moTa}</p>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <KhoModal
          kho={selected}
          onClose={() => {
            setShowModal(false);
            setSelected(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setSelected(null);
            load();
          }}
        />
      )}

      {deleteTarget && <ConfirmDeleteModal kho={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => handleDelete(deleteTarget)} />}
    </div>
  );
}
