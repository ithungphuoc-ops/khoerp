"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Truck, Package, ListChecks } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { TrangThaiDonMuaHang } from "@/lib/types/purchasing";

function dauThang(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}
function homNay(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const TRANG_THAI_LABEL: Record<TrangThaiDonMuaHang, { label: string; className: string }> = {
  nhap: { label: "Nháp", className: "bg-hp-text-muted/15 text-hp-text-muted" },
  da_gui_ncc: { label: "Đã gửi NCC", className: "bg-hp-primary/15 text-hp-primary" },
  da_xac_nhan: { label: "Đã xác nhận", className: "bg-hp-primary/15 text-hp-primary" },
  nhan_mot_phan: { label: "Nhận một phần", className: "bg-hp-warning/15 text-hp-warning" },
  nhan_du: { label: "Nhận đủ", className: "bg-hp-success/15 text-hp-success" },
  huy: { label: "Hủy", className: "bg-hp-danger/15 text-hp-danger" },
};

interface CongNoNCCRow {
  maNCC: string;
  tenNCC: string;
  tongDatHang: number;
  daThanhToan: number;
  conNo: number;
}

function TheoNCCReport() {
  const [rows, setRows] = useState<CongNoNCCRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ theoNCC: CongNoNCCRow[] }>("/purchasing/cong-no");
      setRows((res.theoNCC || []).sort((a, b) => b.conNo - a.conNo));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-hp-text-muted">Tổng hợp toàn bộ lịch sử mua hàng (không lọc theo ngày) — xếp theo Còn nợ giảm dần.</p>
        <button onClick={load} className="hp-btn-ghost ml-auto">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="border border-hp-border rounded-hp-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-hp-surface text-hp-text-muted text-xs">
              <th className="px-3 py-2 text-left">Nhà cung cấp</th>
              <th className="px-3 py-2 text-right w-32">Tổng đặt hàng</th>
              <th className="px-3 py-2 text-right w-32">Đã thanh toán</th>
              <th className="px-3 py-2 text-right w-32">Còn nợ</th>
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr>
                <td colSpan={4} className="py-10 text-center">
                  <RefreshCw size={18} className="animate-spin mx-auto text-hp-text-muted" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center text-hp-text-muted text-sm">
                  Chưa có dữ liệu mua hàng
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.maNCC} className="border-t border-hp-border hover:bg-hp-surface/50">
                  <td className="px-3 py-2 text-hp-text">{r.tenNCC}</td>
                  <td className="px-3 py-2 text-right text-hp-text-muted">{r.tongDatHang.toLocaleString("vi-VN")}</td>
                  <td className="px-3 py-2 text-right text-hp-success">{r.daThanhToan.toLocaleString("vi-VN")}</td>
                  <td className={`px-3 py-2 text-right font-medium ${r.conNo > 0 ? "text-hp-danger" : "text-hp-text-muted"}`}>{r.conNo.toLocaleString("vi-VN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface MatHangRow {
  maHang?: string;
  tenHang: string;
  donViTinh?: string;
  soLanMua: number;
  tongSoLuongDat: number;
  tongThanhTien: number;
  tongTienThue: number;
}

function TheoMatHangReport() {
  const [tuNgay, setTuNgay] = useState(dauThang());
  const [denNgay, setDenNgay] = useState(homNay());
  const [rows, setRows] = useState<MatHangRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function xemBaoCao() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tuNgay) params.set("tu_ngay", tuNgay);
      if (denNgay) params.set("den_ngay", denNgay);
      const res = await api.get<{ items: MatHangRow[] }>(`/purchasing/bao-cao/theo-mat-hang?${params}`);
      setRows(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    xemBaoCao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs text-hp-text-muted mb-1 block">Từ ngày</label>
          <input type="date" className="hp-input" value={tuNgay} onChange={(e) => setTuNgay(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-hp-text-muted mb-1 block">Đến ngày</label>
          <input type="date" className="hp-input" value={denNgay} onChange={(e) => setDenNgay(e.target.value)} />
        </div>
        <button onClick={xemBaoCao} disabled={loading} className="hp-btn-primary gap-1.5">
          <Search size={14} /> {loading ? "Đang tải..." : "Xem báo cáo"}
        </button>
      </div>

      <div className="border border-hp-border rounded-hp-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-hp-surface text-hp-text-muted text-xs">
              <th className="px-3 py-2 text-left w-24">Mã hàng</th>
              <th className="px-3 py-2 text-left">Tên hàng</th>
              <th className="px-3 py-2 text-center w-16">ĐVT</th>
              <th className="px-3 py-2 text-right w-20">Số lần mua</th>
              <th className="px-3 py-2 text-right w-24">Tổng SL đặt</th>
              <th className="px-3 py-2 text-right w-32">Tổng thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <RefreshCw size={18} className="animate-spin mx-auto text-hp-text-muted" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-hp-text-muted text-sm">
                  Không có dữ liệu mua hàng trong khoảng lọc
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-t border-hp-border hover:bg-hp-surface/50">
                  <td className="px-3 py-2 font-mono text-xs text-hp-primary">{r.maHang || "—"}</td>
                  <td className="px-3 py-2 text-hp-text">{r.tenHang}</td>
                  <td className="px-3 py-2 text-center text-hp-text-muted text-xs">{r.donViTinh || "—"}</td>
                  <td className="px-3 py-2 text-right text-hp-text-muted">{r.soLanMua}</td>
                  <td className="px-3 py-2 text-right text-hp-text">{r.tongSoLuongDat}</td>
                  <td className="px-3 py-2 text-right text-hp-text font-medium">{r.tongThanhTien.toLocaleString("vi-VN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DonChuaNhanDuRow {
  soChungTu: string;
  maNCC: string;
  tenNCC?: string;
  ngayDatHang: string;
  ngayGiaoDuKien?: string;
  trangThai: TrangThaiDonMuaHang;
  tongSoLuongDat: number;
  tongSoLuongDaNhan: number;
  kho: { maKho: string; tenKho: string } | null;
}

function DonChuaNhanDuReport() {
  const [rows, setRows] = useState<DonChuaNhanDuRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: DonChuaNhanDuRow[] }>("/purchasing/bao-cao/don-chua-nhan-du");
      setRows(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-hp-text-muted">Các đơn mua hàng chưa nhận đủ hàng (chưa Hủy, chưa Nhận đủ).</p>
        <button onClick={load} className="hp-btn-ghost ml-auto">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="border border-hp-border rounded-hp-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-hp-surface text-hp-text-muted text-xs">
              <th className="px-3 py-2 text-left">Số đơn</th>
              <th className="px-3 py-2 text-left">Nhà cung cấp</th>
              <th className="px-3 py-2 text-left">Kho nhận</th>
              <th className="px-3 py-2 text-left">Ngày đặt</th>
              <th className="px-3 py-2 text-left">Ngày giao dự kiến</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-right w-28">Tiến độ nhận</th>
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              <tr>
                <td colSpan={7} className="py-10 text-center">
                  <RefreshCw size={18} className="animate-spin mx-auto text-hp-text-muted" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-hp-text-muted text-sm">
                  Không có đơn nào đang chờ nhận hàng
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const info = TRANG_THAI_LABEL[r.trangThai] || { label: r.trangThai, className: "bg-hp-text-muted/15 text-hp-text-muted" };
                return (
                  <tr key={r.soChungTu} className="border-t border-hp-border hover:bg-hp-surface/50">
                    <td className="px-3 py-2 font-medium text-hp-primary">{r.soChungTu}</td>
                    <td className="px-3 py-2 text-hp-text">{r.tenNCC || r.maNCC}</td>
                    <td className="px-3 py-2 text-hp-text-muted text-xs">{r.kho?.tenKho || "—"}</td>
                    <td className="px-3 py-2 text-hp-text-muted text-xs">{new Date(r.ngayDatHang).toLocaleDateString("vi-VN")}</td>
                    <td className="px-3 py-2 text-hp-text-muted text-xs">{r.ngayGiaoDuKien ? new Date(r.ngayGiaoDuKien).toLocaleDateString("vi-VN") : "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${info.className}`}>{info.label}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-hp-text-muted">
                      {r.tongSoLuongDaNhan}/{r.tongSoLuongDat}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const SUB_TABS = [
  { key: "ncc", label: "Theo Nhà cung cấp", icon: Truck },
  { key: "mathang", label: "Theo mặt hàng", icon: Package },
  { key: "chuanhandu", label: "Đơn chưa nhận đủ", icon: ListChecks },
] as const;

export function BaoCaoTab() {
  const [subTab, setSubTab] = useState<(typeof SUB_TABS)[number]["key"]>("ncc");

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 px-4 pt-3 border-b border-hp-border shrink-0">
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          const active = subTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-t-md border-b-2 transition-colors ${
                active ? "border-hp-primary text-hp-primary font-medium bg-hp-primary/5" : "border-transparent text-hp-text-muted hover:text-hp-text hover:bg-hp-surface"
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-auto">
        {subTab === "ncc" && <TheoNCCReport />}
        {subTab === "mathang" && <TheoMatHangReport />}
        {subTab === "chuanhandu" && <DonChuaNhanDuReport />}
      </div>
    </div>
  );
}
