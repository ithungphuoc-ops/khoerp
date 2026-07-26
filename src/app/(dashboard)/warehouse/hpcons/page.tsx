"use client";

import { useState, useEffect } from "react";
import { Package, ArrowDownToLine, ArrowUpFromLine, BarChart2, Box, ArrowRightLeft, Warehouse, type LucideIcon } from "lucide-react";
import { api } from "@/lib/apiClient";
import { NhapKhoTab } from "./components/NhapKhoTab";
import { XuatKhoTab } from "./components/XuatKhoTab";
import { TonKhoTab } from "./components/TonKhoTab";
import { HangHoaTab } from "./components/HangHoaTab";
import { ChuyenKhoTab } from "./components/ChuyenKhoTab";
import { KhoTab } from "./components/KhoTab";
import type { KhoRow } from "./components/types";

const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "nhap", label: "Nhập kho", icon: ArrowDownToLine },
  { key: "xuat", label: "Xuất kho", icon: ArrowUpFromLine },
  { key: "chuyen", label: "Chuyển kho", icon: ArrowRightLeft },
  { key: "ton", label: "Tồn kho", icon: BarChart2 },
  { key: "hanghoa", label: "Hàng hóa", icon: Box },
  { key: "dskho", label: "Danh sách kho", icon: Warehouse },
];

export default function WarehouseHPConsPage() {
  const [tab, setTab] = useState("nhap");
  const [khoList, setKhoList] = useState<KhoRow[]>([]);
  const [selectedKho, setSelectedKho] = useState("");

  useEffect(() => {
    api
      .get<{ items: KhoRow[] }>("/warehouse/kho")
      .then((r) => setKhoList(r.items || []))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 border-b border-hp-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-hp-primary" />
            <h1 className="text-base font-semibold text-hp-text">Kho Tổng HPCons</h1>
          </div>
          <select className="hp-input w-44 text-sm" value={selectedKho} onChange={(e) => setSelectedKho(e.target.value)}>
            <option value="">Tất cả kho</option>
            {khoList.map((k) => (
              <option key={k.maKho} value={k.maKho}>
                {k.tenKho}
              </option>
            ))}
          </select>
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
        {tab === "nhap" && <NhapKhoTab khoId={selectedKho} khoList={khoList} />}
        {tab === "xuat" && <XuatKhoTab khoId={selectedKho} khoList={khoList} />}
        {tab === "chuyen" && <ChuyenKhoTab khoId={selectedKho} khoList={khoList} />}
        {tab === "ton" && <TonKhoTab khoId={selectedKho} />}
        {tab === "hanghoa" && <HangHoaTab />}
        {tab === "dskho" && <KhoTab />}
      </div>
    </div>
  );
}
