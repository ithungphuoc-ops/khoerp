"use client";

import { useState } from "react";
import { ShoppingCart, Package, Truck, FileText, PackageCheck, Wallet, BarChart3, type LucideIcon } from "lucide-react";
import { HangHoaMuaHangTab } from "./components/HangHoaMuaHangTab";
import { NhaCungCapTab } from "./components/NhaCungCapTab";
import { DonMuaHangTab } from "./components/DonMuaHangTab";
import { NhanHangTab } from "./components/NhanHangTab";
import { ThanhToanTab } from "./components/ThanhToanTab";
import { BaoCaoTab } from "./components/BaoCaoTab";

const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "donhang", label: "Đơn mua hàng", icon: FileText },
  { key: "nhanhang", label: "Nhận hàng", icon: PackageCheck },
  { key: "thanhtoan", label: "Theo dõi công nợ", icon: Wallet },
  { key: "baocao", label: "Báo cáo", icon: BarChart3 },
  { key: "ncc", label: "Nhà cung cấp", icon: Truck },
  { key: "hanghoa", label: "Hàng hóa/Dịch vụ", icon: Package },
];

export default function PurchasingPage() {
  const [tab, setTab] = useState("donhang");

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 border-b border-hp-border">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart size={18} className="text-hp-primary" />
          <h1 className="text-base font-semibold text-hp-text">Mua hàng</h1>
        </div>
        <div className="flex gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-t-md border-b-2 transition-colors ${
                  active ? "border-hp-primary text-hp-primary font-medium bg-hp-primary/5" : "border-transparent text-hp-text-muted hover:text-hp-text hover:bg-hp-surface"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === "donhang" && <DonMuaHangTab />}
        {tab === "nhanhang" && <NhanHangTab />}
        {tab === "thanhtoan" && <ThanhToanTab />}
        {tab === "baocao" && <BaoCaoTab />}
        {tab === "ncc" && <NhaCungCapTab />}
        {tab === "hanghoa" && <HangHoaMuaHangTab />}
      </div>
    </div>
  );
}
