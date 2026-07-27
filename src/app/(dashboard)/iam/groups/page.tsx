"use client";

import { useEffect, useState } from "react";
import { Plus, Users, Trash2, UserMinus, X, RefreshCw } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { AccountRow } from "@/lib/types/system";

interface GroupRow {
  id: string;
  tenNhom: string;
  moTa?: string;
  color: string;
  active: boolean;
  member_count?: number;
}

interface GroupMember {
  id: string;
  email: string;
  hoTen?: string;
  avatarUrl?: string;
  roles: { tenRole: string; color: string } | null;
}

interface GroupDetail extends GroupRow {
  members: GroupMember[];
}

function Avatar({ user, size = 28 }: { user: GroupMember; size?: number }) {
  const initials = (user.hoTen || user.email || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ width: size, height: size, background: user.roles?.color || "var(--hp-accent)" }}
    >
      {initials}
    </div>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selected, setSelected] = useState<GroupRow | null>(null);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [allAccounts, setAllAccounts] = useState<AccountRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [form, setForm] = useState({ ten_nhom: "", mo_ta: "", color: "#6b7280" });

  async function load() {
    try {
      const res = await api.get<{ groups: GroupRow[] }>("/iam/groups");
      setGroups(res.groups || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadDetail(id: string) {
    setLoadingDetail(true);
    try {
      setDetail(await api.get<GroupDetail>(`/iam/groups/${id}`));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (selected) loadDetail(selected.id);
  }, [selected]);

  async function createGroup() {
    if (!form.ten_nhom.trim()) return;
    try {
      await api.post("/iam/groups", form);
      setShowAdd(false);
      setForm({ ten_nhom: "", mo_ta: "", color: "#6b7280" });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi");
    }
  }

  async function deleteGroup(id: string) {
    if (!confirm("Xóa nhóm này?")) return;
    try {
      await api.delete(`/iam/groups/${id}`);
      setSelected(null);
      setDetail(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi");
    }
  }

  async function removeMember(userId: string) {
    if (!selected) return;
    try {
      await api.delete(`/iam/groups/${selected.id}/members/${userId}`);
      loadDetail(selected.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi");
    }
  }

  async function loadAccounts() {
    if (allAccounts.length) {
      setShowAddMember(true);
      return;
    }
    try {
      const res = await api.get<{ accounts: AccountRow[] }>("/iam/accounts?limit=100");
      setAllAccounts(res.accounts || []);
      setShowAddMember(true);
    } catch (e) {
      console.error(e);
    }
  }

  async function addMember(userId: string) {
    if (!selected) return;
    try {
      await api.post(`/iam/groups/${selected.id}/members`, { user_ids: [userId] });
      loadDetail(selected.id);
      setShowAddMember(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi");
    }
  }

  const memberIds = new Set((detail?.members || []).map((m) => m.id));
  const available = allAccounts.filter((a) => !memberIds.has(a.id));

  return (
    <div className="flex h-full">
      <div className="flex flex-col border-r border-hp-border" style={{ width: 280 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-hp-border shrink-0">
          <span className="text-sm font-medium text-hp-text">Nhóm người dùng</span>
          <button onClick={() => setShowAdd(!showAdd)} className="hp-btn-ghost p-1">
            <Plus size={15} />
          </button>
        </div>

        {showAdd && (
          <div className="p-3 border-b border-hp-border bg-hp-surface/30 flex flex-col gap-2">
            <input
              className="hp-input text-xs"
              placeholder="Tên nhóm *"
              value={form.ten_nhom}
              onChange={(e) => setForm((f) => ({ ...f, ten_nhom: e.target.value }))}
              autoFocus
            />
            <textarea
              className="hp-input text-xs h-14 resize-none"
              placeholder="Mô tả (tùy chọn)"
              value={form.mo_ta}
              onChange={(e) => setForm((f) => ({ ...f, mo_ta: e.target.value }))}
            />
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-8 h-7 rounded border-0 cursor-pointer" />
              <button onClick={createGroup} className="hp-btn-primary text-xs h-7 flex-1">
                Tạo nhóm
              </button>
              <button onClick={() => setShowAdd(false)} className="hp-btn-ghost text-xs h-7">
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {groups.map((g) => (
            <div
              key={g.id}
              onClick={() => setSelected(g)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer group transition-colors ${
                selected?.id === g.id ? "bg-hp-sidebar-active border-r-2 border-hp-primary" : "hover:bg-hp-surface/50"
              }`}
            >
              <div className="w-8 h-8 rounded-hp-md flex items-center justify-center shrink-0" style={{ background: g.color + "25", border: `1px solid ${g.color}40` }}>
                <Users size={14} style={{ color: g.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${selected?.id === g.id ? "text-hp-text font-medium" : "text-hp-text-secondary"}`}>{g.tenNhom}</p>
                <p className="text-xs text-hp-text-disabled">{g.member_count ?? 0} thành viên</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteGroup(g.id);
                }}
                className="p-1 text-hp-text-muted hover:text-hp-danger opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {!groups.length && <p className="text-center text-hp-text-muted text-xs py-8">Chưa có nhóm nào</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex items-center justify-center flex-1 text-hp-text-muted text-sm">Chọn một nhóm để xem thành viên</div>
        ) : (
          <>
            <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-hp-md flex items-center justify-center" style={{ background: selected.color + "20", border: `1px solid ${selected.color}40` }}>
                  <Users size={16} style={{ color: selected.color }} />
                </div>
                <div>
                  <p className="font-medium text-hp-text">{selected.tenNhom}</p>
                  <p className="text-xs text-hp-text-muted">{detail?.members?.length ?? 0} thành viên</p>
                </div>
              </div>
              <button onClick={loadAccounts} className="hp-btn-primary">
                <Plus size={14} /> Thêm thành viên
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw size={20} className="animate-spin text-hp-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(detail?.members || []).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-hp-md border border-hp-border hover:border-hp-border/80 group transition-colors">
                      <Avatar user={m} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-hp-text truncate">{m.hoTen || m.email}</p>
                        <p className="text-xs text-hp-text-muted truncate">{m.email}</p>
                      </div>
                      {m.roles && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: (m.roles.color || "#6b7280") + "20", color: m.roles.color || "#6b7280" }}>
                          {m.roles.tenRole}
                        </span>
                      )}
                      <button onClick={() => removeMember(m.id)} className="p-1 text-hp-text-muted hover:text-hp-danger opacity-0 group-hover:opacity-100 transition-opacity shrink-0" title="Xóa khỏi nhóm">
                        <UserMinus size={14} />
                      </button>
                    </div>
                  ))}
                  {!detail?.members?.length && <div className="col-span-2 text-center text-hp-text-muted text-sm py-10">Nhóm chưa có thành viên</div>}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="hp-card w-full max-w-sm p-5 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <p className="font-medium text-hp-text">Thêm thành viên vào &quot;{selected?.tenNhom}&quot;</p>
              <button onClick={() => setShowAddMember(false)} className="hp-btn-ghost p-1">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
              {available.map((a) => (
                <button key={a.id} onClick={() => addMember(a.id)} className="flex items-center gap-2.5 px-3 py-2 rounded-hp-md hover:bg-hp-surface/70 text-left transition-colors">
                  <div className="w-7 h-7 rounded-full bg-hp-accent flex items-center justify-center text-xs text-white font-semibold shrink-0">
                    {(a.hoTen || a.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-hp-text truncate">{a.hoTen || a.email}</p>
                    <p className="text-xs text-hp-text-muted truncate">{a.email}</p>
                  </div>
                </button>
              ))}
              {!available.length && <p className="text-center text-hp-text-muted text-sm py-4">Tất cả đã là thành viên</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
