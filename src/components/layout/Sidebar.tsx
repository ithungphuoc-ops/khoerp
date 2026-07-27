"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Warehouse,
  Users,
  Handshake,
  ShoppingCart,
  Package,
  CheckSquare,
  BarChart3,
  Bot,
  Settings,
  Building2,
  HardHat,
  ChevronDown,
  ChevronRight,
  Zap,
  Shield,
  User,
  ShieldCheck,
  ClipboardList,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Warehouse,
  Users,
  Handshake,
  ShoppingCart,
  Package,
  CheckSquare,
  BarChart3,
  Bot,
  Settings,
  Building2,
  HardHat,
  Shield,
  User,
  ShieldCheck,
  ClipboardList,
  SlidersHorizontal,
};

interface MenuChild {
  code: string;
  label: string;
  icon: string;
  route: string;
}

interface MenuItem {
  code?: string;
  label?: string;
  icon?: string;
  route?: string;
  children?: MenuChild[];
  beta?: boolean;
  divider?: boolean;
}

// Cấu trúc menu tĩnh — sau này có thể load từ /api/modules theo permission.
const MENU: MenuItem[] = [
  { code: "dashboard", label: "Dashboard", icon: "LayoutDashboard", route: "/" },
  { divider: true },
  {
    code: "warehouse",
    label: "Kho",
    icon: "Warehouse",
    route: "/warehouse",
    children: [
      { code: "warehouse_total", label: "Kho Tổng HPCons", icon: "Building2", route: "/warehouse/hpcons" },
      { code: "warehouse_projects", label: "Kho Công trình", icon: "HardHat", route: "/warehouse/projects" },
    ],
  },
  {
    code: "iam",
    label: "Người dùng",
    icon: "Shield",
    route: "/iam",
    children: [
      { code: "iam_dash", label: "Dashboard", icon: "LayoutDashboard", route: "/iam" },
      { code: "iam_groups", label: "Nhóm người dùng", icon: "Users", route: "/iam/groups" },
      { code: "iam_audit", label: "Nhật ký hoạt động", icon: "ClipboardList", route: "/iam/audit" },
      { code: "iam_settings", label: "Cài đặt", icon: "SlidersHorizontal", route: "/iam/settings" },
    ],
  },
  { code: "crm", label: "CRM", icon: "Handshake", route: "/crm", beta: true },
  { code: "purchasing", label: "Mua hàng", icon: "ShoppingCart", route: "/purchasing", beta: true },
  { code: "assets", label: "Tài sản", icon: "Package", route: "/assets", beta: true },
  { code: "tasks", label: "Công việc", icon: "CheckSquare", route: "/tasks", beta: true },
  { divider: true },
  { code: "reports", label: "Báo cáo", icon: "BarChart3", route: "/reports", beta: true },
  { code: "ai", label: "AI Center", icon: "Bot", route: "/ai", beta: true },
  { divider: true },
  { code: "settings", label: "Cài đặt", icon: "Settings", route: "/settings", beta: true },
];

function NavItem({ item, depth = 0 }: { item: MenuItem; depth?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() => item.children?.some((c) => pathname.startsWith(c.route)) ?? false);

  if (item.divider) {
    return <div className="my-1 border-t border-hp-border-subtle" />;
  }

  const Icon = item.icon ? ICON_MAP[item.icon] : undefined;
  const hasChildren = !!item.children?.length;
  const route = item.route!;
  const isActive = hasChildren
    ? pathname.startsWith(route)
    : pathname === route || (route !== "/" && pathname.startsWith(`${route}/`));

  const baseClass = clsx(
    "flex items-center gap-2.5 w-full px-3 h-9 rounded-hp-md text-sm transition-all duration-150 group select-none",
    depth > 0 && "ml-2 w-[calc(100%-8px)]",
    isActive ? "bg-hp-sidebar-active text-hp-primary font-medium" : "text-hp-text-muted hover:text-hp-text hover:bg-hp-sidebar-hover"
  );

  if (hasChildren) {
    return (
      <div>
        <button onClick={() => setOpen((v) => !v)} className={baseClass}>
          {Icon && <Icon size={16} className={clsx("shrink-0", isActive ? "text-hp-primary" : "text-hp-text-muted group-hover:text-hp-text")} />}
          <span className="flex-1 text-left truncate">{item.label}</span>
          {open ? <ChevronDown size={13} className="shrink-0 opacity-60" /> : <ChevronRight size={13} className="shrink-0 opacity-60" />}
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5 animate-slideIn">
            {item.children!.map((child) => (
              <NavItem key={child.code} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={route} className={baseClass}>
      {Icon && <Icon size={16} className={clsx("shrink-0", isActive ? "text-hp-primary" : "text-hp-text-muted group-hover:text-hp-text")} />}
      <span className="flex-1 truncate">{item.label}</span>
      {item.beta && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-hp-accent/20 text-hp-accent font-medium">Beta</span>}
    </Link>
  );
}

export function Sidebar() {
  return (
    <aside
      className="flex flex-col shrink-0 overflow-y-auto"
      style={{
        width: "var(--hp-sidebar-width)",
        background: "var(--hp-sidebar)",
        borderRight: "1px solid var(--hp-border)",
        height: "100%",
      }}
    >
      <div className="flex items-center gap-3 px-4 h-14 border-b border-hp-border shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-hp-md bg-hp-primary/15 border border-hp-primary/30">
          <Zap size={16} className="text-hp-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-hp-text leading-none">HPCons ERP</p>
          <p className="text-[11px] text-hp-text-disabled mt-0.5">Platform v2.0</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {MENU.map((item, idx) => (
          <NavItem key={item.code || `div-${idx}`} item={item} />
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-hp-border-subtle shrink-0">
        <p className="text-[11px] text-hp-text-disabled text-center">HP Cons Việt Nam © {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
