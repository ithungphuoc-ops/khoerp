"use client";

import { useRouter } from "next/navigation";
import { Building2, HardHat, ArrowRight, type LucideIcon } from "lucide-react";

interface CardDef {
  route: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  label: string;
  desc: string;
  items: string[];
}

const CARDS: CardDef[] = [
  {
    route: "/warehouse/hpcons",
    icon: Building2,
    color: "#2dd4bf",
    bg: "rgba(45,212,191,0.1)",
    label: "Kho Tổng HPCons",
    desc: "Quản lý kho trung tâm toàn công ty — vật tư, thiết bị, VPP, TSCĐ...",
    items: ["Nhập mua", "Xuất cấp phòng ban", "Xuất cấp công trình", "Điều chuyển", "Kiểm kê"],
  },
  {
    route: "/warehouse/projects",
    icon: HardHat,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.1)",
    label: "Kho Công trình",
    desc: "Quản lý kho riêng cho từng công trình — nhập, xuất, tồn, báo cáo, AI đọc PDF.",
    items: ["Danh sách công trình", "Nhập kho", "Xuất kho", "Tồn kho", "AI Reader"],
  },
];

export default function WarehouseHomePage() {
  const router = useRouter();
  return (
    <div className="p-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-hp-text">Kho</h1>
        <p className="text-sm text-hp-text-muted mt-1">Chọn hệ thống kho cần quản lý</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.route} onClick={() => router.push(card.route)} className="hp-card p-6 cursor-pointer hover:border-hp-primary/40 transition-all duration-150 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-hp-lg flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon size={22} style={{ color: card.color }} />
                </div>
                <div>
                  <p className="text-base font-semibold text-hp-text">{card.label}</p>
                </div>
              </div>

              <p className="text-sm text-hp-text-muted mb-4 leading-relaxed">{card.desc}</p>

              <div className="space-y-1.5 mb-5">
                {card.items.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-hp-text-secondary">
                    <div className="w-1 h-1 rounded-full shrink-0" style={{ background: card.color }} />
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-sm font-medium transition-colors" style={{ color: card.color }}>
                Mở <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
