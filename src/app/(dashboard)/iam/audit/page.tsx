"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { api } from "@/lib/apiClient";

function formatDT(dt?: string) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "#22c55e",
  LOGOUT: "#64748b",
  CREATE_USER: "#3b82f6",
  UPDATE_USER: "#f59e0b",
  LOCK_USER: "#ef4444",
  UNLOCK_USER: "#22c55e",
  RESET_PASSWORD: "#8b5cf6",
  CHANGE_ROLE: "#06b6d4",
  UPDATE_PERMISSIONS: "#f59e0b",
  DELETE_USER: "#ef4444",
  UPDATE_SETTINGS: "#6366f1",
  ASSIGN_GROUPS: "#2dd4bf",
};

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] || "#6b7280";
  return (
    <span className="hp-badge text-xs font-medium" style={{ background: color + "20", color }}>
      {action}
    </span>
  );
}

interface AuditLogRow {
  id: string;
  action: string;
  moduleCode?: string;
  moTa?: string;
  createdAt: string;
  users: { hoTen?: string; email: string; roles: { tenRole: string; color: string } | null } | null;
}

interface Filter {
  user_id: string;
  module_code: string;
  action: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTER: Filter = { user_id: "", module_code: "", action: "", date_from: "", date_to: "" };

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState<Filter>(EMPTY_FILTER);
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const LIMIT = 50;

  function setF<K extends keyof Filter>(k: K, v: Filter[K]) {
    setFilter((f) => ({ ...f, [k]: v }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      Object.entries(filter).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      const res = await api.get<{ logs: AuditLogRow[]; total: number }>(`/iam/audit?${params}`);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get<{ actions: string[] }>("/iam/audit/actions")
      .then((r) => setActionOptions(r.actions || []))
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / LIMIT);

  function applyFilter() {
    setPage(1);
    load();
  }
  function clearFilter() {
    setFilter(EMPTY_FILTER);
    setPage(1);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-hp-border shrink-0 flex-wrap">
        <span className="text-sm font-medium text-hp-text">Nhật ký hoạt động</span>
        <span className="text-xs text-hp-text-muted">({total} bản ghi)</span>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowFilter(!showFilter)} className={`hp-btn-secondary ${showFilter ? "border-hp-primary/50 text-hp-primary" : ""}`}>
            <Filter size={14} /> Bộ lọc
          </button>
          <button onClick={load} className="hp-btn-ghost">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="px-6 py-3 border-b border-hp-border bg-hp-surface/30 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-hp-text-muted">Action</label>
            <select className="hp-input w-44" value={filter.action} onChange={(e) => setF("action", e.target.value)}>
              <option value="">— Tất cả —</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-hp-text-muted">Module</label>
            <input className="hp-input w-36" placeholder="module_code..." value={filter.module_code} onChange={(e) => setF("module_code", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-hp-text-muted">Từ ngày</label>
            <input type="date" className="hp-input w-36" value={filter.date_from} onChange={(e) => setF("date_from", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-hp-text-muted">Đến ngày</label>
            <input type="date" className="hp-input w-36" value={filter.date_to} onChange={(e) => setF("date_to", e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={applyFilter} className="hp-btn-primary">
              Lọc
            </button>
            <button onClick={clearFilter} className="hp-btn-secondary">
              Xóa
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10" style={{ background: "var(--hp-surface)" }}>
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Thời gian</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Người dùng</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Action</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Module</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-hp-text-muted uppercase tracking-wider">Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <RefreshCw size={20} className="animate-spin mx-auto text-hp-primary" />
                </td>
              </tr>
            )}
            {!loading && !logs.length && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-hp-text-muted text-sm">
                  Không có nhật ký
                </td>
              </tr>
            )}
            {!loading &&
              logs.map((log, i) => (
                <tr key={log.id || i} className="border-t border-hp-border-subtle hover:bg-hp-surface/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-hp-text-muted whitespace-nowrap">{formatDT(log.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    {log.users ? (
                      <div>
                        <p className="text-sm text-hp-text">{log.users.hoTen || log.users.email}</p>
                        <p className="text-xs text-hp-text-disabled">{log.users.email}</p>
                      </div>
                    ) : (
                      <span className="text-hp-text-muted text-xs">System</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-hp-text-muted">{log.moduleCode || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-hp-text-secondary max-w-xs truncate">{log.moTa || "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-hp-border shrink-0">
        <span className="text-xs text-hp-text-muted">
          Trang {page}/{totalPages || 1} · {total} bản ghi
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
    </div>
  );
}
