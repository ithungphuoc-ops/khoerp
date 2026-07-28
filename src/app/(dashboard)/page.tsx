"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Warehouse,
  Users,
  ShoppingCart,
  Package,
  CheckSquare,
  TrendingUp,
  Bell,
  ArrowRight,
  Building2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";

interface DashboardStats {
  total_users: number;
  total_modules: number;
  system_status: string;
}

interface ModuleCardDef {
  code: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  desc: string;
  route: string;
  active: boolean;
  sub?: { label: string; icon: LucideIcon; route: string }[];
}

const MODULE_CARDS: ModuleCardDef[] = [
  {
    code: "warehouse",
    label: "Kho",
    icon: Warehouse,
    color: "#2dd4bf",
    bg: "rgba(45,212,191,0.1)",
    desc: "Kho Tổng HPCons",
    route: "/warehouse",
    active: true,
    sub: [
      { label: "Kho Tổng HPCons", icon: Building2, route: "/warehouse/hpcons" },
    ],
  },
  {
    code: "iam",
    label: "Người dùng",
    icon: Users,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    desc: "Quản lý tài khoản, vai trò & phân quyền",
    route: "/iam",
    active: true,
  },
  {
    code: "purchasing",
    label: "Mua hàng",
    icon: ShoppingCart,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.1)",
    desc: "Đề nghị mua, phê duyệt, PO",
    route: "/purchasing",
    active: false,
  },
  {
    code: "assets",
    label: "Tài sản",
    icon: Package,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    desc: "TSCĐ, công cụ dụng cụ, thiết bị",
    route: "/assets",
    active: false,
  },
  {
    code: "tasks",
    label: "Công việc",
    icon: CheckSquare,
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    desc: "Kanban, Gantt, Calendar",
    route: "/tasks",
    active: false,
  },
  {
    code: "reports",
    label: "Báo cáo",
    icon: TrendingUp,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    desc: "Tổng hợp toàn bộ phân hệ",
    route: "/reports",
    active: false,
  },
];

function KpiCard({ label, value, icon: Icon, color, bg }: { label: string; value: React.ReactNode; icon: LucideIcon; color: string; bg: string }) {
  return (
    <div className="hp-card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-hp-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-hp-text">{value ?? "—"}</p>
        <p className="text-sm text-hp-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ModuleCard({ mod, onOpen }: { mod: ModuleCardDef; onOpen: (route: string) => void }) {
  const Icon = mod.icon;
  return (
    <div className={clsx("hp-card p-5 transition-all duration-150", mod.active ? "hover:border-hp-primary/40 cursor-pointer group" : "opacity-60")}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-hp-lg flex items-center justify-center" style={{ background: mod.bg }}>
          <Icon size={18} style={{ color: mod.color }} />
        </div>
        {mod.active ? (
          <button onClick={() => onOpen(mod.route)} className="flex items-center gap-1 text-xs text-hp-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Mở <ArrowRight size={12} />
          </button>
        ) : (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-hp-surface text-hp-text-disabled border border-hp-border">Sắp ra mắt</span>
        )}
      </div>
      <p className="text-sm font-semibold text-hp-text mb-1">{mod.label}</p>
      <p className="text-xs text-hp-text-muted">{mod.desc}</p>

      {mod.sub && mod.active && (
        <div className="mt-4 space-y-1.5 border-t border-hp-border-subtle pt-4">
          {mod.sub.map((s) => {
            const SIcon = s.icon;
            return (
              <button key={s.route} onClick={() => onOpen(s.route)} className="flex items-center gap-2 w-full text-sm text-hp-text-secondary hover:text-hp-primary transition-colors">
                <SIcon size={13} className="shrink-0" />
                {s.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api
      .get<DashboardStats>("/dashboard/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl font-semibold text-hp-text">
          {greeting()}, {user?.hoTen || user?.email?.split("@")[0]} 👋
        </h1>
        <p className="text-sm text-hp-text-muted mt-1">
          {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Người dùng" value={stats?.total_users} icon={Users} color="#2dd4bf" bg="rgba(45,212,191,0.1)" />
        <KpiCard label="Phân hệ" value={stats?.total_modules} icon={Zap} color="#6366f1" bg="rgba(99,102,241,0.1)" />
        <KpiCard label="Thông báo" value={0} icon={Bell} color="#f59e0b" bg="rgba(245,158,11,0.1)" />
        <KpiCard label="Trạng thái" value="Online" icon={TrendingUp} color="#22c55e" bg="rgba(34,197,94,0.1)" />
      </div>

      <div>
        <h2 className="text-base font-semibold text-hp-text mb-4">Phân hệ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULE_CARDS.map((mod) => (
            <ModuleCard key={mod.code} mod={mod} onOpen={(route) => router.push(route)} />
          ))}
        </div>
      </div>
    </div>
  );
}
