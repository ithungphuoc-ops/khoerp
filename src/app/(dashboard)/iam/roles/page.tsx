"use client";

import { Fragment, useEffect, useState } from "react";
import { Plus, Save, Copy, Trash2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { RoleRow } from "@/lib/types/system";

interface PermissionRow {
  module_code: string;
  ten: string;
  icon?: string;
  parent_code?: string | null;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_import: boolean;
  can_export: boolean;
  can_ai: boolean;
  can_report: boolean;
  [key: string]: unknown;
}

const PERM_COLS: { key: keyof PermissionRow; short: string }[] = [
  { key: "can_view", short: "Xem" },
  { key: "can_create", short: "Thêm" },
  { key: "can_edit", short: "Sửa" },
  { key: "can_delete", short: "Xóa" },
  { key: "can_approve", short: "Duyệt" },
  { key: "can_import", short: "Imp" },
  { key: "can_export", short: "Exp" },
  { key: "can_ai", short: "AI" },
  { key: "can_report", short: "Rpt" },
];

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
        checked ? "bg-hp-primary/20 border border-hp-primary/50" : "border border-hp-border hover:border-hp-text-muted"
      }`}
    >
      {checked && <div className="w-2 h-2 rounded-sm bg-hp-primary" />}
    </button>
  );
}

function PermissionMatrix({ permissions, onChange }: { permissions: PermissionRow[]; onChange: (updater: (prev: PermissionRow[]) => PermissionRow[]) => void }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const parents = permissions.filter((p) => !p.parent_code);
  const children = permissions.filter((p) => p.parent_code);

  function toggleCollapse(code: string) {
    setCollapsed((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function set(moduleCode: string, permKey: keyof PermissionRow, value: boolean) {
    onChange((prev) => prev.map((p) => (p.module_code === moduleCode ? { ...p, [permKey]: value } : p)));
  }

  function toggleRow(moduleCode: string, value: boolean) {
    onChange((prev) =>
      prev.map((p) => {
        if (p.module_code !== moduleCode) return p;
        const next = { ...p };
        PERM_COLS.forEach((c) => {
          next[c.key] = value;
        });
        return next;
      })
    );
  }

  function checkAllCol(permKey: keyof PermissionRow, value: boolean) {
    onChange((prev) => prev.map((p) => ({ ...p, [permKey]: value })));
  }

  function renderRow(item: PermissionRow, depth = 0) {
    const p = permissions.find((x) => x.module_code === item.module_code);
    if (!p) return null;
    const allChecked = PERM_COLS.every((c) => p[c.key]);

    return (
      <tr key={item.module_code} className="border-t border-hp-border-subtle hover:bg-hp-surface/30">
        <td className="px-3 py-2">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
            <Checkbox checked={!!allChecked} onChange={() => toggleRow(item.module_code, !allChecked)} />
            <span className="text-sm text-hp-text">{item.ten}</span>
          </div>
        </td>
        {PERM_COLS.map((col) => (
          <td key={col.key} className="px-2 py-2 text-center">
            <div className="flex items-center justify-center">
              <Checkbox checked={!!p[col.key]} onChange={() => set(item.module_code, col.key, !p[col.key])} />
            </div>
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse min-w-[700px]">
        <thead className="sticky top-0 z-10" style={{ background: "var(--hp-surface)" }}>
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-hp-text-muted">Module</th>
            {PERM_COLS.map((col) => (
              <th key={col.key} className="px-2 py-2.5 text-center w-14">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-hp-text-muted">{col.short}</span>
                  <div className="flex gap-1">
                    <button onClick={() => checkAllCol(col.key, true)} className="text-[10px] text-hp-primary hover:underline leading-none">
                      All
                    </button>
                    <span className="text-hp-border">|</span>
                    <button onClick={() => checkAllCol(col.key, false)} className="text-[10px] text-hp-danger hover:underline leading-none">
                      None
                    </button>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {parents.map((parent) => {
            const childItems = children.filter((c) => c.parent_code === parent.module_code);
            const isCollapsed = collapsed[parent.module_code];
            const p = permissions.find((x) => x.module_code === parent.module_code);
            const allChecked = p && PERM_COLS.every((c) => p[c.key]);
            return (
              <Fragment key={parent.module_code}>
                <tr className="border-t border-hp-border bg-hp-surface/20">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {childItems.length > 0 && (
                        <button onClick={() => toggleCollapse(parent.module_code)} className="text-hp-text-muted hover:text-hp-text">
                          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                      )}
                      {!childItems.length && <div className="w-3.5" />}
                      <Checkbox checked={!!allChecked} onChange={() => toggleRow(parent.module_code, !allChecked)} />
                      <span className="text-sm font-medium text-hp-text">{parent.ten}</span>
                    </div>
                  </td>
                  {PERM_COLS.map((col) => (
                    <td key={col.key} className="px-2 py-2 text-center">
                      {p && (
                        <div className="flex items-center justify-center">
                          <Checkbox checked={!!p[col.key]} onChange={() => set(parent.module_code, col.key, !p[col.key])} />
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                {!isCollapsed && childItems.map((child) => renderRow(child, 1))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleRow | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#818cf8");

  async function loadRoles() {
    setLoadingRoles(true);
    try {
      const res = await api.get<{ roles: RoleRow[] }>("/iam/roles");
      const list = res.roles || [];
      setRoles(list);
      setSelectedRole((prev) => prev ?? (list.length ? list[0] : null));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRoles(false);
    }
  }

  async function loadPermissions(roleId: string) {
    setLoadingPerms(true);
    try {
      const res = await api.get<{ permissions: PermissionRow[] }>(`/iam/roles/${roleId}/permissions`);
      setPermissions(res.permissions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPerms(false);
    }
  }

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) loadPermissions(selectedRole.id);
  }, [selectedRole]);

  async function savePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.put(`/iam/roles/${selectedRole.id}/permissions`, permissions);
      setMsg({ ok: true, text: "Đã lưu phân quyền" });
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Lỗi lưu" });
    } finally {
      setSaving(false);
    }
  }

  async function cloneRole(roleId: string) {
    try {
      await api.post(`/iam/roles/${roleId}/clone`);
      loadRoles();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi clone");
    }
  }

  async function deleteRole(roleId: string) {
    if (!confirm("Xóa vai trò này?")) return;
    try {
      await api.delete(`/iam/roles/${roleId}`);
      setSelectedRole(null);
      loadRoles();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Không thể xóa");
    }
  }

  async function addRole() {
    if (!newRoleName.trim()) return;
    try {
      await api.post("/iam/roles", { ten_role: newRoleName.trim(), color: newRoleColor });
      setShowAdd(false);
      setNewRoleName("");
      loadRoles();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Lỗi tạo vai trò");
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col shrink-0 border-r border-hp-border" style={{ width: 220 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-hp-border">
          <span className="text-sm font-medium text-hp-text">Vai trò</span>
          <button onClick={() => setShowAdd(!showAdd)} className="hp-btn-ghost p-1">
            <Plus size={15} />
          </button>
        </div>

        {showAdd && (
          <div className="p-3 border-b border-hp-border bg-hp-surface/30 flex flex-col gap-2">
            <input
              className="hp-input text-xs"
              placeholder="Tên vai trò"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRole()}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <input type="color" value={newRoleColor} onChange={(e) => setNewRoleColor(e.target.value)} className="w-8 h-7 rounded cursor-pointer border-0 bg-transparent" />
              <button onClick={addRole} className="hp-btn-primary text-xs h-7 flex-1">
                Tạo
              </button>
              <button onClick={() => setShowAdd(false)} className="hp-btn-ghost text-xs h-7">
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {loadingRoles ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={16} className="animate-spin text-hp-text-muted" />
            </div>
          ) : (
            roles.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer group transition-colors ${
                  selectedRole?.id === r.id ? "bg-hp-sidebar-active border-r-2 border-hp-primary" : "hover:bg-hp-surface/50"
                }`}
                onClick={() => setSelectedRole(r)}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color || "#6b7280" }} />
                <span className={`flex-1 text-sm truncate ${selectedRole?.id === r.id ? "text-hp-text font-medium" : "text-hp-text-secondary"}`}>{r.tenRole}</span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cloneRole(r.id);
                    }}
                    className="p-1 text-hp-text-muted hover:text-hp-accent"
                    title="Clone"
                  >
                    <Copy size={12} />
                  </button>
                  {r.tenRole !== "ADMIN" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRole(r.id);
                      }}
                      className="p-1 text-hp-text-muted hover:text-hp-danger"
                      title="Xóa"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border shrink-0">
          <div>
            {selectedRole ? (
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: selectedRole.color || "#6b7280" }} />
                <span className="font-medium text-hp-text">{selectedRole.tenRole}</span>
                {selectedRole.moTa && <span className="text-xs text-hp-text-muted">— {selectedRole.moTa}</span>}
              </div>
            ) : (
              <span className="text-hp-text-muted text-sm">Chọn vai trò để xem phân quyền</span>
            )}
          </div>
          {selectedRole && (
            <div className="flex items-center gap-2">
              {msg && <span className={`text-xs ${msg.ok ? "text-hp-success" : "text-hp-danger"}`}>{msg.text}</span>}
              <button onClick={savePermissions} disabled={saving} className="hp-btn-primary">
                <Save size={14} /> {saving ? "Đang lưu..." : "Lưu phân quyền"}
              </button>
            </div>
          )}
        </div>

        {!selectedRole ? (
          <div className="flex items-center justify-center flex-1 text-hp-text-muted text-sm">Chọn một vai trò bên trái để cấu hình phân quyền</div>
        ) : loadingPerms ? (
          <div className="flex items-center justify-center flex-1">
            <RefreshCw size={20} className="animate-spin text-hp-primary" />
          </div>
        ) : (
          <PermissionMatrix permissions={permissions} onChange={setPermissions} />
        )}
      </div>
    </div>
  );
}
