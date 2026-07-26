"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { HangHoaRow } from "./types";

interface TonKhoRow {
  khoId: string;
  hangHoaId: string;
  soLuong: number;
  updatedAt: string;
  hangHoa: HangHoaRow | null;
  kho: { maKho: string; tenKho: string } | null;
}

interface KpiData {
  tong_mat_hang: number;
  tong_gia_tri: number;
  het_hang: number;
}

export function TonKhoTab({ khoId = "" }: { khoId?: string }) {
  const [items, setItems] = useState<TonKhoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (khoId) params.set("kho_id", khoId);
      const [res, kpiRes] = await Promise.all([
        api.get<{ items: TonKhoRow[]; total: number }>(`/warehouse/ton-kho?${params}`),
        api.get<KpiData>("/warehouse/ton-kho/kpi"),
      ]);
      setItems(res.items || []);
      setTotal(res.total || 0);
      setKpi(kpiRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, khoId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-hp-surface border border-hp-border rounded-hp-md p-4">
          <p className="text-xs text-hp-text-muted">Tổng mặt hàng</p>
          <p className="text-2xl font-bold mt-1 text-hp-primary">{kpi?.tong_mat_hang || 0}</p>
        </div>
        <div className="bg-hp-surface border border-hp-border rounded-hp-md p-4">
          <p className="text-xs text-hp-text-muted">Tổng giá trị tồn</p>
          <p className="text-2xl font-bold mt-1 text-hp-success">{((kpi?.tong_gia_tri || 0) / 1e6).toFixed(1)}M</p>
        </div>
        <div className="bg-hp-surface border border-hp-border rounded-hp-md p-4">
          <p className="text-xs text-hp-text-muted">Hết hàng</p>
          <p className="text-2xl font-bold mt-1 text-hp-danger">{kpi?.het_hang || 0}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hp-text-muted" />
          <input
            className="hp-input w-full pl-8"
            placeholder="Tìm mã hàng, tên hàng..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <button onClick={load} className="hp-btn-ghost">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="border border-hp-border rounded-hp-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-hp-surface text-hp-text-muted text-xs border-b border-hp-border">
              <th className="px-4 py-2.5 text-left">Mã hàng</th>
              <th className="px-4 py-2.5 text-left">Tên hàng</th>
              <th className="px-4 py-2.5 text-left">Nhóm</th>
              <th className="px-4 py-2.5 text-left">Kho</th>
              <th className="px-4 py-2.5 text-center">ĐVT</th>
              <th className="px-4 py-2.5 text-right">Tồn kho</th>
              <th className="px-4 py-2.5 text-right">Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <RefreshCw size={20} className="animate-spin mx-auto text-hp-text-muted" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-hp-text-muted text-sm">
                  Chưa có dữ liệu tồn kho
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const hh = item.hangHoa;
                const kho = item.kho;
                const sl = item.soLuong || 0;
                return (
                  <tr key={`${item.khoId}_${item.hangHoaId}`} className="border-t border-hp-border hover:bg-hp-surface/50">
                    <td className="px-4 py-2.5 font-mono text-xs text-hp-primary">{hh?.maHang}</td>
                    <td className="px-4 py-2.5 text-hp-text">{hh?.tenHang}</td>
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{hh?.nhomHang || "—"}</td>
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{kho?.tenKho}</td>
                    <td className="px-4 py-2.5 text-center text-hp-text-muted text-xs">{hh?.donViTinh}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${sl <= 0 ? "text-hp-danger" : sl < 10 ? "text-hp-warning" : "text-hp-text"}`}>
                      {sl.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-2.5 text-right text-hp-text-muted text-xs">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("vi-VN") : "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-hp-text-muted">
        <span>Tổng số: {total} mặt hàng</span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="hp-btn-ghost p-1 disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="hp-btn-ghost p-1 disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
