"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, UserX, Clock, Wifi, WifiOff, ShieldCheck, UserCog, RefreshCw } from "lucide-react";
import { api } from "@/lib/apiClient";

interface IamDashboardData {
  kpi: {
    total: number;
    active: number;
    locked: number;
    pending: number;
    online: number;
    offline: number;
  };
  users_by_role: { tenRole: string; color: string; count: number }[];
  users_by_dept: { phong_ban: string; count: number }[];
  login_7days: { ngay: string; count: number }[];
}

function KPICard({ icon: Icon, label, value, color, sub }: { icon: typeof Users; label: string; value: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="hp-card p-4 flex items-start gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-hp-md shrink-0" style={{ background: color + "20", border: `1px solid ${color}40` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-hp-text leading-none">{value ?? "—"}</p>
        <p className="text-xs text-hp-text-muted mt-1">{label}</p>
        {sub && <p className="text-xs text-hp-text-disabled mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-hp-text-secondary w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-hp-surface overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color || "var(--hp-primary)" }} />
      </div>
      <span className="text-xs font-medium text-hp-text w-6 text-right shrink-0">{count}</span>
    </div>
  );
}

function LoginChart({ data }: { data?: { ngay: string; count: number }[] }) {
  if (!data?.length) return <div className="text-center text-hp-text-muted text-xs py-8">Chưa có dữ liệu</div>;
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-24 px-1">
      {data.map((d) => {
        const h = Math.max(4, Math.round((d.count / maxVal) * 88));
        const day = d.ngay?.slice(5) || "";
        return (
          <div key={d.ngay} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-[10px] text-hp-text-muted opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
            <div className="w-full rounded-t-sm transition-all duration-300" style={{ height: h, background: "var(--hp-primary)", opacity: d.count ? 1 : 0.2 }} />
            <span className="text-[10px] text-hp-text-disabled">{day}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function IAMDashboardPage() {
  const [data, setData] = useState<IamDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<IamDashboardData>("/iam/dashboard"));
    } catch {
      setError("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const kpi = data?.kpi;
  const maxRole = Math.max(...(data?.users_by_role?.map((r) => r.count) || [1]));
  const maxDept = Math.max(...(data?.users_by_dept?.map((d) => d.count) || [1]));

  return (
    <div className="flex flex-col gap-6 p-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-hp-text">Người dùng — Dashboard</h1>
          <p className="text-sm text-hp-text-muted mt-0.5">Tổng quan hệ thống IAM</p>
        </div>
        <button onClick={load} disabled={loading} className="hp-btn-ghost flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {error && <div className="hp-card p-4 border-hp-danger/30 bg-hp-danger/5 text-hp-danger text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Users} label="Tổng tài khoản" value={kpi?.total} color="#6366f1" />
        <KPICard icon={UserCheck} label="Đang hoạt động" value={kpi?.active} color="#22c55e" />
        <KPICard icon={UserX} label="Đã khóa" value={kpi?.locked} color="#ef4444" />
        <KPICard icon={Clock} label="Chờ kích hoạt" value={kpi?.pending} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Wifi} label="Online (15 phút)" value={kpi?.online} color="#2dd4bf" sub="trong 15 phút qua" />
        <KPICard icon={WifiOff} label="Offline" value={kpi?.offline} color="#64748b" />
        <KPICard icon={ShieldCheck} label="Đang dùng" value={kpi?.active} color="#3b82f6" sub="tài khoản active" />
        <KPICard icon={UserCog} label="Tổng vai trò" value={data?.users_by_role?.length ?? "—"} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="hp-card p-4">
          <h3 className="text-sm font-medium text-hp-text mb-4">Người dùng theo Vai trò</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="hp-skeleton h-4 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(data?.users_by_role || []).map((r) => (
                <BarRow key={r.tenRole} label={r.tenRole} count={r.count} max={maxRole} color={r.color} />
              ))}
              {!data?.users_by_role?.length && <p className="text-xs text-hp-text-muted text-center py-4">Chưa có dữ liệu</p>}
            </div>
          )}
        </div>

        <div className="hp-card p-4">
          <h3 className="text-sm font-medium text-hp-text mb-4">Người dùng theo Phòng ban</h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="hp-skeleton h-4 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(data?.users_by_dept || []).map((d) => (
                <BarRow key={d.phong_ban} label={d.phong_ban} count={d.count} max={maxDept} />
              ))}
              {!data?.users_by_dept?.length && <p className="text-xs text-hp-text-muted text-center py-4">Chưa có dữ liệu</p>}
            </div>
          )}
        </div>

        <div className="hp-card p-4">
          <h3 className="text-sm font-medium text-hp-text mb-4">Lượt đăng nhập 7 ngày</h3>
          {loading ? <div className="hp-skeleton h-24 rounded" /> : <LoginChart data={data?.login_7days} />}
        </div>
      </div>
    </div>
  );
}
