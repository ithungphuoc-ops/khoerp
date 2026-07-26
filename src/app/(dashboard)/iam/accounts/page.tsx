"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Download, Upload, RefreshCw, Search, Lock, Unlock, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/apiClient";
import { AccountDrawer } from "./AccountDrawer";

export interface AccountRow {
  id: string;
  email: string;
  hoTen?: string;
  username?: string;
  soDienThoai?: string;
  phongBan?: string;
  chucVu?: string;
  avatarUrl?: string;
  active: boolean;
  isLocked: boolean;
  lastLogin?: string | null;
  createdAt: string;
  roleId?: string | null;
  roles: { id: string; tenRole: string; color: string } | null;
}

export interface RoleRow {
  id: string;
  tenRole: string;
  moTa?: string;
  color: string;
  active: boolean;
}

function Avatar({ user, size = 32 }: { user: AccountRow; size?: number }) {
  const initials = (user.hoTen || user.email || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt={user.hoTen} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ width: size, height: size, background: "var(--hp-accent)" }}>
      {initials}
    </div>
  );
}

function StatusBadge({ active, locked }: { active: boolean; locked: boolean }) {
  if (locked) return <span className="hp-badge bg-hp-danger/15 text-hp-danger">Đã khóa</span>;
  if (!active) return <span className="hp-badge bg-hp-warning/15 text-hp-warning">Chờ kích hoạt</span>;
  return <span className="hp-badge bg-hp-success/15 text-hp-success">Hoạt động</span>;
}

function RoleBadge({ role }: { role: AccountRow["roles"] }) {
  if (!role) return null;
  return (
    <span className="hp-badge text-xs font-medium" style={{ background: (role.color || "#6b7280") + "20", color: role.color || "#6b7280" }}>
      {role.tenRole}
    </span>
  );
}

function formatDate(dt?: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set("search", search);
      const res = await api.get<{ accounts: AccountRow[]; total: number }>(`/iam/accounts?${params}`);
      setAccounts(res.accounts || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error("load accounts:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get<{ roles: RoleRow[] }>("/iam/roles")
      .then((r) => setRoles(r.roles || []))
      .catch(() => {});
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    if (selected.length === accounts.length) setSelected([]);
    else setSelected(accounts.map((a) => a.id));
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-hp-border shrink-0 flex-wrap">
        <button onClick={() => setShowAdd(true)} className="hp-btn-primary">
          <Plus size={15} /> Thêm tài khoản
        </button>

        <div className="w-px h-5 bg-hp-border" />

        <button className="hp-btn-secondary">
          <Upload size={14} /> Import
        </button>
        <button className="hp-btn-secondary">
          <Download size={14} /> Export
        </button>

        {selected.length > 0 && (
          <>
            <div className="w-px h-5 bg-hp-border" />
            <span className="text-xs text-hp-text-muted">Đã chọn {selected.length}</span>
            <button className="hp-btn-ghost text-hp-warning">
              <Lock size={14} /> Khóa
            </button>
            <button className="hp-btn-ghost text-hp-success">
              <Unlock size={14} /> Mở khóa
            </button>
            <button className="hp-btn-ghost text-hp-danger">
              <Trash2 size={14} /> Xóa
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-1">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-hp-text-disabled" />
              <input className="hp-input pl-8 w-56" placeholder="Tìm tên, email, username..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </div>
            <button type="submit" className="hp-btn-secondary">
              Tìm
            </button>
          </form>
          <button onClick={load} className="hp-btn-ghost">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10" style={{ background: "var(--hp-surface)" }}>
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <input type="checkbox" checked={selected.length === accounts.length && accounts.length > 0} onChange={selectAll} className="cursor-pointer" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Người dùng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Điện thoại</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Phòng ban</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Vai trò</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Login cuối</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-hp-text-muted">
                  <RefreshCw size={20} className="animate-spin mx-auto" />
                </td>
              </tr>
            )}
            {!loading && accounts.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-hp-text-muted text-sm">
                  Không có tài khoản nào
                </td>
              </tr>
            )}
            {!loading &&
              accounts.map((acc) => (
                <tr key={acc.id} className="border-t border-hp-border-subtle hover:bg-hp-surface/50 cursor-pointer transition-colors" onClick={() => setDrawerUserId(acc.id)}>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(acc.id);
                    }}
                  >
                    <input type="checkbox" checked={selected.includes(acc.id)} onChange={() => toggleSelect(acc.id)} className="cursor-pointer" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar user={acc} />
                      <div className="min-w-0">
                        <p className="font-medium text-hp-text truncate">{acc.hoTen || "—"}</p>
                        {acc.username && <p className="text-xs text-hp-text-disabled">@{acc.username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-hp-text-secondary">{acc.email}</td>
                  <td className="px-4 py-3 text-hp-text-secondary">{acc.soDienThoai || "—"}</td>
                  <td className="px-4 py-3 text-hp-text-secondary">{acc.phongBan || "—"}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={acc.roles} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={acc.active} locked={acc.isLocked} />
                  </td>
                  <td className="px-4 py-3 text-hp-text-muted text-xs">{formatDate(acc.lastLogin)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-hp-border shrink-0">
        <span className="text-xs text-hp-text-muted">
          {total} tài khoản · Trang {page}/{totalPages || 1}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="hp-btn-ghost p-1.5 disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="hp-btn-ghost p-1.5 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {drawerUserId && <AccountDrawer userId={drawerUserId} roles={roles} onClose={() => setDrawerUserId(null)} onRefresh={load} />}
      {showAdd && (
        <AddAccountModal
          roles={roles}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

interface AddAccountForm {
  email: string;
  password: string;
  hoTen: string;
  phongBan: string;
  chucVu: string;
  roleId: string;
}

function AddAccountModal({ roles, onClose, onSuccess }: { roles: RoleRow[]; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<AddAccountForm>({ email: "", password: "", hoTen: "", phongBan: "", chucVu: "", roleId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof AddAccountForm>(k: K, v: AddAccountForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/iam/accounts", form);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tạo tài khoản");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="hp-card w-full max-w-md p-6 animate-fadeIn">
        <h2 className="text-base font-semibold text-hp-text mb-5">Thêm tài khoản mới</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-hp-text-muted">Email *</label>
            <input className="hp-input" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-hp-text-muted">Mật khẩu *</label>
            <input className="hp-input" type="password" required minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-hp-text-muted">Họ tên</label>
            <input className="hp-input" value={form.hoTen} onChange={(e) => set("hoTen", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-hp-text-muted">Phòng ban</label>
              <input className="hp-input" value={form.phongBan} onChange={(e) => set("phongBan", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-hp-text-muted">Chức vụ</label>
              <input className="hp-input" value={form.chucVu} onChange={(e) => set("chucVu", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-hp-text-muted">Vai trò</label>
            <select className="hp-input" value={form.roleId} onChange={(e) => set("roleId", e.target.value)}>
              <option value="">— Chọn vai trò —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.tenRole}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-hp-danger">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" className="hp-btn-primary flex-1" disabled={loading}>
              {loading ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
            <button type="button" onClick={onClose} className="hp-btn-secondary">
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
