"use client";

import { useEffect, useState } from "react";
import { X, User, Shield, Users, ClipboardList, Lock, Unlock, Key, Camera, Save, type LucideIcon } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { RoleRow } from "./page";

interface AccountDetail {
  id: string;
  email: string;
  hoTen?: string;
  username?: string;
  soDienThoai?: string;
  phongBan?: string;
  chucVu?: string;
  ngaySinh?: string | null;
  gioiTinh?: string | null;
  moTa?: string;
  active: boolean;
  isLocked: boolean;
  lockedAt?: string | null;
  lockedReason?: string;
  roleId?: string | null;
  roles: { id: string; tenRole: string; color: string } | null;
  groups: { id: string; tenNhom: string; color: string }[];
  activity: { action: string; moTa?: string; moduleCode?: string; createdAt: string }[];
}

const TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "info", label: "Thông tin", icon: User },
  { id: "security", label: "Bảo mật", icon: Shield },
  { id: "role", label: "Vai trò", icon: Shield },
  { id: "groups", label: "Nhóm", icon: Users },
  { id: "history", label: "Lịch sử", icon: ClipboardList },
];

function formatDT(dt?: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

const ACTION_LABELS: Record<string, { color: string; label: string }> = {
  LOGIN: { color: "#22c55e", label: "Đăng nhập" },
  LOGOUT: { color: "#64748b", label: "Đăng xuất" },
  CREATE_USER: { color: "#3b82f6", label: "Tạo TK" },
  UPDATE_USER: { color: "#f59e0b", label: "Cập nhật" },
  LOCK_USER: { color: "#ef4444", label: "Khóa TK" },
  UNLOCK_USER: { color: "#22c55e", label: "Mở khóa" },
  RESET_PASSWORD: { color: "#8b5cf6", label: "Reset pass" },
  CHANGE_ROLE: { color: "#06b6d4", label: "Đổi role" },
  ASSIGN_GROUPS: { color: "#2dd4bf", label: "Đổi nhóm" },
};

function ActionBadge({ action }: { action: string }) {
  const info = ACTION_LABELS[action] || { color: "#6b7280", label: action };
  return (
    <span className="hp-badge text-xs" style={{ background: info.color + "20", color: info.color }}>
      {info.label}
    </span>
  );
}

function TabInfo({ user, onSaved }: { user: AccountDetail; onSaved?: () => void }) {
  const [form, setForm] = useState({
    hoTen: user.hoTen || "",
    username: user.username || "",
    soDienThoai: user.soDienThoai || "",
    phongBan: user.phongBan || "",
    chucVu: user.chucVu || "",
    ngaySinh: user.ngaySinh?.slice(0, 10) || "",
    gioiTinh: user.gioiTinh || "",
    moTa: user.moTa || "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setLoading(true);
    setMsg(null);
    try {
      await api.put(`/iam/accounts/${user.id}`, form);
      setMsg({ ok: true, text: "Đã lưu thành công" });
      onSaved?.();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Lỗi lưu" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-hp-accent flex items-center justify-center text-xl font-bold text-white">
            {(user.hoTen || user.email || "?").charAt(0).toUpperCase()}
          </div>
          <button className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-hp-surface border border-hp-border flex items-center justify-center">
            <Camera size={10} className="text-hp-text-muted" />
          </button>
        </div>
        <div>
          <p className="font-medium text-hp-text">{user.hoTen || user.email}</p>
          <p className="text-xs text-hp-text-disabled">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-hp-text-muted">Họ tên</label>
          <input className="hp-input" value={form.hoTen} onChange={(e) => set("hoTen", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-hp-text-muted">Username</label>
          <input className="hp-input" value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="@username" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-hp-text-muted">Điện thoại</label>
          <input className="hp-input" value={form.soDienThoai} onChange={(e) => set("soDienThoai", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-hp-text-muted">Ngày sinh</label>
          <input className="hp-input" type="date" value={form.ngaySinh} onChange={(e) => set("ngaySinh", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-hp-text-muted">Phòng ban</label>
          <input className="hp-input" value={form.phongBan} onChange={(e) => set("phongBan", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-hp-text-muted">Chức vụ</label>
          <input className="hp-input" value={form.chucVu} onChange={(e) => set("chucVu", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-hp-text-muted">Giới tính</label>
          <select className="hp-input" value={form.gioiTinh} onChange={(e) => set("gioiTinh", e.target.value)}>
            <option value="">— Chọn —</option>
            <option>Nam</option>
            <option>Nữ</option>
            <option>Khác</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-hp-text-muted">Mô tả</label>
        <textarea className="hp-input h-20 resize-none" value={form.moTa} onChange={(e) => set("moTa", e.target.value)} />
      </div>

      {msg && <p className={`text-xs ${msg.ok ? "text-hp-success" : "text-hp-danger"}`}>{msg.text}</p>}

      <button onClick={save} disabled={loading} className="hp-btn-primary">
        <Save size={14} /> {loading ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </div>
  );
}

function TabSecurity({ user, onRefresh }: { user: AccountDetail; onRefresh?: () => void }) {
  const [newPass, setNewPass] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [loading, setLoading] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function act(action: "reset" | "lock" | "unlock") {
    setLoading(action);
    setMsg(null);
    try {
      if (action === "reset") {
        await api.post(`/iam/accounts/${user.id}/reset-password`, { new_password: newPass });
        setNewPass("");
        setMsg({ ok: true, text: "Đã reset mật khẩu" });
      } else if (action === "lock") {
        await api.post(`/iam/accounts/${user.id}/lock`, { reason: lockReason });
        setMsg({ ok: true, text: "Đã khóa tài khoản" });
        onRefresh?.();
      } else if (action === "unlock") {
        await api.post(`/iam/accounts/${user.id}/unlock`);
        setMsg({ ok: true, text: "Đã mở khóa" });
        onRefresh?.();
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Lỗi" });
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="hp-card p-4 bg-hp-surface/50">
        <p className="text-xs text-hp-text-muted mb-1">Trạng thái tài khoản</p>
        <p className="font-medium text-hp-text">{user.isLocked ? "🔴 Đã khóa" : user.active ? "🟢 Hoạt động" : "🟡 Chờ kích hoạt"}</p>
        {user.lockedReason && <p className="text-xs text-hp-text-muted mt-1">Lý do: {user.lockedReason}</p>}
        {user.lockedAt && <p className="text-xs text-hp-text-disabled mt-0.5">Thời gian khóa: {formatDT(user.lockedAt)}</p>}
      </div>

      <div className="border border-hp-border rounded-hp-md p-4">
        <p className="text-sm font-medium text-hp-text mb-3 flex items-center gap-2">
          <Key size={14} className="text-hp-accent" /> Đặt lại mật khẩu
        </p>
        <div className="flex gap-2">
          <input className="hp-input flex-1" type="password" placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          <button onClick={() => act("reset")} disabled={!newPass || newPass.length < 6 || loading === "reset"} className="hp-btn-secondary">
            {loading === "reset" ? "..." : "Reset"}
          </button>
        </div>
      </div>

      <div className="border border-hp-border rounded-hp-md p-4">
        <p className="text-sm font-medium text-hp-text mb-3 flex items-center gap-2">
          <Lock size={14} className="text-hp-danger" /> Khóa / Mở khóa
        </p>
        {!user.isLocked ? (
          <div className="flex flex-col gap-2">
            <input className="hp-input" placeholder="Lý do khóa (tùy chọn)" value={lockReason} onChange={(e) => setLockReason(e.target.value)} />
            <button onClick={() => act("lock")} disabled={loading === "lock"} className="hp-btn bg-hp-danger/10 border border-hp-danger/30 text-hp-danger hover:bg-hp-danger/20">
              <Lock size={14} /> {loading === "lock" ? "Đang khóa..." : "Khóa tài khoản"}
            </button>
          </div>
        ) : (
          <button onClick={() => act("unlock")} disabled={loading === "unlock"} className="hp-btn bg-hp-success/10 border border-hp-success/30 text-hp-success hover:bg-hp-success/20 w-full">
            <Unlock size={14} /> {loading === "unlock" ? "Đang mở..." : "Mở khóa tài khoản"}
          </button>
        )}
      </div>

      {msg && <p className={`text-xs ${msg.ok ? "text-hp-success" : "text-hp-danger"}`}>{msg.text}</p>}
    </div>
  );
}

function TabRole({ user, roles, onRefresh }: { user: AccountDetail; roles: RoleRow[]; onRefresh?: () => void }) {
  const [selectedRole, setSelectedRole] = useState(user.roleId || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setLoading(true);
    setMsg(null);
    try {
      await api.put(`/iam/accounts/${user.id}/role`, { role_id: selectedRole });
      setMsg({ ok: true, text: "Đã cập nhật vai trò" });
      onRefresh?.();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Lỗi" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-xs text-hp-text-muted mb-1">Chọn vai trò cho tài khoản này</p>
      <div className="flex flex-col gap-2">
        {roles.map((r) => (
          <label
            key={r.id}
            className={`flex items-center gap-3 p-3 rounded-hp-md border cursor-pointer transition-colors ${
              selectedRole === r.id ? "border-hp-primary/40 bg-hp-primary/5" : "border-hp-border hover:bg-hp-surface/50"
            }`}
          >
            <input type="radio" name="role" value={r.id} checked={selectedRole === r.id} onChange={() => setSelectedRole(r.id)} className="cursor-pointer" />
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color || "#6b7280" }} />
            <div>
              <p className="text-sm font-medium text-hp-text">{r.tenRole}</p>
              {r.moTa && <p className="text-xs text-hp-text-muted">{r.moTa}</p>}
            </div>
          </label>
        ))}
      </div>
      {msg && <p className={`text-xs ${msg.ok ? "text-hp-success" : "text-hp-danger"}`}>{msg.text}</p>}
      <button onClick={save} disabled={loading} className="hp-btn-primary mt-2">
        <Save size={14} /> {loading ? "Đang lưu..." : "Lưu vai trò"}
      </button>
    </div>
  );
}

function TabGroups({ user, onRefresh }: { user: AccountDetail; onRefresh?: () => void }) {
  const [allGroups, setAllGroups] = useState<{ id: string; tenNhom: string; moTa?: string; color: string }[]>([]);
  const [userGroupIds, setUserGroupIds] = useState<string[]>(user.groups?.map((g) => g.id) || []);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api
      .get<{ groups: { id: string; tenNhom: string; moTa?: string; color: string }[] }>("/iam/groups")
      .then((r) => setAllGroups(r.groups || []))
      .catch(() => {});
  }, []);

  function toggle(id: string) {
    setUserGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    setLoading(true);
    try {
      await api.put(`/iam/accounts/${user.id}/groups`, { group_ids: userGroupIds });
      setMsg({ ok: true, text: "Đã lưu nhóm" });
      onRefresh?.();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Lỗi" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-xs text-hp-text-muted mb-1">Chọn nhóm cho tài khoản này</p>
      <div className="flex flex-col gap-2">
        {allGroups.map((g) => (
          <label
            key={g.id}
            className={`flex items-center gap-3 p-3 rounded-hp-md border cursor-pointer transition-colors ${
              userGroupIds.includes(g.id) ? "border-hp-primary/40 bg-hp-primary/5" : "border-hp-border hover:bg-hp-surface/50"
            }`}
          >
            <input type="checkbox" checked={userGroupIds.includes(g.id)} onChange={() => toggle(g.id)} className="cursor-pointer" />
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: g.color || "#6b7280" }} />
            <div>
              <p className="text-sm text-hp-text">{g.tenNhom}</p>
              {g.moTa && <p className="text-xs text-hp-text-muted">{g.moTa}</p>}
            </div>
          </label>
        ))}
        {!allGroups.length && <p className="text-xs text-hp-text-muted text-center py-4">Chưa có nhóm nào</p>}
      </div>
      {msg && <p className={`text-xs ${msg.ok ? "text-hp-success" : "text-hp-danger"}`}>{msg.text}</p>}
      <button onClick={save} disabled={loading} className="hp-btn-primary mt-1">
        <Save size={14} /> {loading ? "Đang lưu..." : "Lưu nhóm"}
      </button>
    </div>
  );
}

function TabHistory({ logs }: { logs?: AccountDetail["activity"] }) {
  if (!logs?.length) {
    return <div className="text-center text-hp-text-muted text-sm py-10 px-4">Chưa có lịch sử</div>;
  }
  return (
    <div className="px-4 py-3 overflow-y-auto">
      <div className="relative border-l-2 border-hp-border ml-3 space-y-0">
        {logs.map((log, i) => (
          <div key={log.createdAt + i} className="relative pl-6 pb-4">
            <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-hp-surface border-2 border-hp-accent" />
            <div className="flex items-center gap-2 flex-wrap">
              <ActionBadge action={log.action} />
              <span className="text-xs text-hp-text-disabled">{formatDT(log.createdAt)}</span>
            </div>
            {log.moTa && <p className="text-xs text-hp-text-secondary mt-0.5">{log.moTa}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AccountDrawer({ userId, roles, onClose, onRefresh }: { userId: string; roles: RoleRow[]; onClose: () => void; onRefresh?: () => void }) {
  const [user, setUser] = useState<AccountDetail | null>(null);
  const [tab, setTab] = useState("info");
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    setLoading(true);
    try {
      setUser(await api.get<AccountDetail>(`/iam/accounts/${userId}`));
    } catch (e) {
      console.error("loadUser:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function handleRefresh() {
    loadUser();
    onRefresh?.();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col shadow-hp-lg" style={{ width: 420, background: "var(--hp-card)", borderLeft: "1px solid var(--hp-border)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-hp-border shrink-0">
          <h3 className="font-semibold text-hp-text text-sm">{loading ? "Đang tải..." : user?.hoTen || user?.email || "Tài khoản"}</h3>
          <button onClick={onClose} className="hp-btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b border-hp-border shrink-0 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id ? "border-hp-primary text-hp-primary" : "border-transparent text-hp-text-muted hover:text-hp-text"
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-5 h-5 border-2 border-hp-primary border-t-transparent rounded-full" />
            </div>
          ) : user ? (
            <>
              {tab === "info" && <TabInfo user={user} onSaved={handleRefresh} />}
              {tab === "security" && <TabSecurity user={user} onRefresh={handleRefresh} />}
              {tab === "role" && <TabRole user={user} roles={roles} onRefresh={handleRefresh} />}
              {tab === "groups" && <TabGroups user={user} onRefresh={handleRefresh} />}
              {tab === "history" && <TabHistory logs={user.activity} />}
            </>
          ) : (
            <div className="text-center text-hp-text-muted text-sm py-10">Không tìm thấy tài khoản</div>
          )}
        </div>
      </div>
    </>
  );
}
