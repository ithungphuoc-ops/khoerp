"use client";

import { Fragment, useState } from "react";
import { Search, RefreshCw, BarChart3, Users2, BookOpen } from "lucide-react";
import { api } from "@/lib/apiClient";
import { HangHoaInput } from "./HangHoaInput";
import type { KhoRow } from "./types";

interface NhapXuatTonRow {
  maHang: string;
  tenHang: string;
  donViTinh?: string;
  tonDauKy: number;
  tongNhap: number;
  tongXuat: number;
  dieuChinhKiemKe: number;
  tonCuoiKy: number;
}

function NhapXuatTonReport({ khoList, defaultKhoId }: { khoList: KhoRow[]; defaultKhoId: string }) {
  const [khoId, setKhoId] = useState(defaultKhoId || khoList[0]?.maKho || "");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [rows, setRows] = useState<NhapXuatTonRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function xemBaoCao() {
    if (!khoId) return setErr("Vui lòng chọn kho");
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ kho_id: khoId });
      if (tuNgay) params.set("tu_ngay", tuNgay);
      if (denNgay) params.set("den_ngay", denNgay);
      const res = await api.get<{ items: NhapXuatTonRow[] }>(`/warehouse/bao-cao/nhap-xuat-ton?${params}`);
      setRows(res.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải báo cáo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs text-hp-text-muted mb-1 block">Kho *</label>
          <select className="hp-input w-48" value={khoId} onChange={(e) => setKhoId(e.target.value)}>
            <option value="">-- Chọn kho --</option>
            {khoList.map((k) => (
              <option key={k.maKho} value={k.maKho}>
                {k.tenKho}
              </option>
            ))}
          </select>
        </div>
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

      {err && <p className="text-sm text-hp-danger">{err}</p>}

      {rows && (
        <div className="border border-hp-border rounded-hp-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-hp-surface text-hp-text-muted text-xs">
                <th className="px-3 py-2 text-left w-24">Mã hàng</th>
                <th className="px-3 py-2 text-left">Tên hàng</th>
                <th className="px-3 py-2 text-center w-16">ĐVT</th>
                <th className="px-3 py-2 text-right w-24">Tồn đầu kỳ</th>
                <th className="px-3 py-2 text-right w-24">Tổng nhập</th>
                <th className="px-3 py-2 text-right w-24">Tổng xuất</th>
                <th className="px-3 py-2 text-right w-24">Điều chỉnh KK</th>
                <th className="px-3 py-2 text-right w-24">Tồn cuối kỳ</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-hp-text-muted text-sm">
                    Kho này chưa có hàng hóa nào
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.maHang} className="border-t border-hp-border">
                    <td className="px-3 py-2 font-mono text-xs text-hp-primary">{r.maHang}</td>
                    <td className="px-3 py-2 text-hp-text">{r.tenHang}</td>
                    <td className="px-3 py-2 text-center text-hp-text-muted text-xs">{r.donViTinh || "—"}</td>
                    <td className="px-3 py-2 text-right text-hp-text-muted">{r.tonDauKy}</td>
                    <td className="px-3 py-2 text-right text-hp-success">{r.tongNhap > 0 ? `+${r.tongNhap}` : 0}</td>
                    <td className="px-3 py-2 text-right text-hp-danger">{r.tongXuat > 0 ? `-${r.tongXuat}` : 0}</td>
                    <td className={`px-3 py-2 text-right ${r.dieuChinhKiemKe > 0 ? "text-hp-success" : r.dieuChinhKiemKe < 0 ? "text-hp-danger" : "text-hp-text-muted"}`}>
                      {r.dieuChinhKiemKe > 0 ? `+${r.dieuChinhKiemKe}` : r.dieuChinhKiemKe}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-hp-text">{r.tonCuoiKy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ChiTietPhieuRow {
  maHang: string;
  tenHang: string;
  soLuong: number;
  thanhTien: number;
}

interface PhieuXuatRow {
  soChungTu: string;
  ngayHachToan: string;
  phongBan?: string;
  congTrinh?: string;
  tongTien: number;
  chiTiet: ChiTietPhieuRow[];
}

interface DonViGroup {
  ten: string;
  soPhieu: number;
  tongTien: number;
  hangHoa: Map<string, { tenHang: string; soLuong: number }>;
}

function XuatTheoDonViReport({ khoList, defaultKhoId }: { khoList: KhoRow[]; defaultKhoId: string }) {
  const [loai, setLoai] = useState<"phong_ban" | "cong_trinh">("phong_ban");
  const [khoId, setKhoId] = useState(defaultKhoId);
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [groups, setGroups] = useState<DonViGroup[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function xemBaoCao() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (khoId) params.set("kho_id", khoId);
      if (tuNgay) params.set("tu_ngay", tuNgay);
      if (denNgay) params.set("den_ngay", denNgay);
      const res = await api.get<{ items: PhieuXuatRow[] }>(`/warehouse/bao-cao/xuat-theo-donvi?${params}`);
      const items = res.items || [];

      const map = new Map<string, DonViGroup>();
      for (const p of items) {
        const key = (loai === "phong_ban" ? p.phongBan : p.congTrinh) || "(Chưa ghi)";
        if (!map.has(key)) map.set(key, { ten: key, soPhieu: 0, tongTien: 0, hangHoa: new Map() });
        const g = map.get(key)!;
        g.soPhieu += 1;
        g.tongTien += p.tongTien || 0;
        for (const ct of p.chiTiet || []) {
          const cur = g.hangHoa.get(ct.maHang) || { tenHang: ct.tenHang, soLuong: 0 };
          cur.soLuong += ct.soLuong || 0;
          g.hangHoa.set(ct.maHang, cur);
        }
      }
      setGroups([...map.values()].sort((a, b) => b.tongTien - a.tongTien));
      setExpanded(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải báo cáo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs text-hp-text-muted mb-1 block">Xem theo</label>
          <select className="hp-input w-40" value={loai} onChange={(e) => setLoai(e.target.value as "phong_ban" | "cong_trinh")}>
            <option value="phong_ban">Phòng ban</option>
            <option value="cong_trinh">Công trình</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-hp-text-muted mb-1 block">Kho</label>
          <select className="hp-input w-44" value={khoId} onChange={(e) => setKhoId(e.target.value)}>
            <option value="">Tất cả kho</option>
            {khoList.map((k) => (
              <option key={k.maKho} value={k.maKho}>
                {k.tenKho}
              </option>
            ))}
          </select>
        </div>
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

      {err && <p className="text-sm text-hp-danger">{err}</p>}

      {groups && (
        <div className="border border-hp-border rounded-hp-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-hp-surface text-hp-text-muted text-xs">
                <th className="px-3 py-2 text-left">{loai === "phong_ban" ? "Phòng ban" : "Công trình"}</th>
                <th className="px-3 py-2 text-right w-28">Số phiếu xuất</th>
                <th className="px-3 py-2 text-right w-32">Tổng giá trị</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-hp-text-muted text-sm">
                    Không có phiếu xuất nào trong khoảng lọc
                  </td>
                </tr>
              ) : (
                groups.map((g) => (
                  <Fragment key={g.ten}>
                    <tr onClick={() => setExpanded(expanded === g.ten ? null : g.ten)} className="border-t border-hp-border hover:bg-hp-surface/50 cursor-pointer">
                      <td className="px-3 py-2 text-hp-text font-medium">{g.ten}</td>
                      <td className="px-3 py-2 text-right text-hp-text">{g.soPhieu}</td>
                      <td className="px-3 py-2 text-right text-hp-text">{g.tongTien.toLocaleString("vi-VN")}</td>
                    </tr>
                    {expanded === g.ten && (
                      <tr className="border-t border-hp-border bg-hp-surface/30">
                        <td colSpan={3} className="px-3 py-3">
                          <p className="text-xs font-medium text-hp-text-muted mb-2 uppercase tracking-wide">Mặt hàng đã xuất</p>
                          <div className="space-y-1">
                            {[...g.hangHoa.entries()].map(([ma, v]) => (
                              <div key={ma} className="flex items-center gap-2 text-sm">
                                <span className="font-mono text-xs text-hp-primary w-20 shrink-0">{ma}</span>
                                <span className="flex-1 text-hp-text">{v.tenHang}</span>
                                <span className="text-hp-text-muted">{v.soLuong}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const LOAI_GIAO_DICH_LABEL: Record<string, { label: string; color: string }> = {
  IMPORT: { label: "Nhập kho", color: "text-hp-success" },
  EXPORT: { label: "Xuất kho", color: "text-hp-danger" },
  TRANSFER_IN: { label: "Chuyển đến", color: "text-hp-success" },
  TRANSFER_OUT: { label: "Chuyển đi", color: "text-hp-danger" },
  ADJUSTMENT: { label: "Kiểm kê", color: "text-hp-warning" },
  REVERSAL: { label: "Hủy/Hoàn tác", color: "text-hp-text-muted" },
};

interface LedgerRow {
  transactionType: string;
  refId: string;
  soLuong: number;
  direction: 1 | -1;
  stockAfter: number;
  createdAt: string;
}

function SoChiTietReport({ khoList, defaultKhoId }: { khoList: KhoRow[]; defaultKhoId: string }) {
  const [khoId, setKhoId] = useState(defaultKhoId || khoList[0]?.maKho || "");
  const [maHang, setMaHang] = useState("");
  const [tenHang, setTenHang] = useState("");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function xemSo() {
    if (!khoId) return setErr("Vui lòng chọn kho");
    if (!maHang) return setErr("Vui lòng chọn mặt hàng");
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ kho_id: khoId, ma_hang: maHang });
      if (tuNgay) params.set("tu_ngay", tuNgay);
      if (denNgay) params.set("den_ngay", denNgay);
      const res = await api.get<{ items: LedgerRow[] }>(`/warehouse/bao-cao/so-chi-tiet?${params}`);
      setRows(res.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải sổ chi tiết");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="text-xs text-hp-text-muted mb-1 block">Kho *</label>
          <select
            className="hp-input w-44"
            value={khoId}
            onChange={(e) => {
              setKhoId(e.target.value);
              setMaHang("");
              setTenHang("");
            }}
          >
            <option value="">-- Chọn kho --</option>
            {khoList.map((k) => (
              <option key={k.maKho} value={k.maKho}>
                {k.tenKho}
              </option>
            ))}
          </select>
        </div>
        <div className="w-64">
          <label className="text-xs text-hp-text-muted mb-1 block">Mặt hàng *</label>
          <HangHoaInput
            value={tenHang}
            field="tenHang"
            khoId={khoId}
            placeholder={khoId ? "Gõ tên/mã hàng..." : "Chọn kho trước"}
            onChange={(hh) => {
              setMaHang(hh.maHang);
              setTenHang(hh.tenHang);
            }}
            onTextChange={(v) => setTenHang(v)}
          />
        </div>
        <div>
          <label className="text-xs text-hp-text-muted mb-1 block">Từ ngày</label>
          <input type="date" className="hp-input" value={tuNgay} onChange={(e) => setTuNgay(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-hp-text-muted mb-1 block">Đến ngày</label>
          <input type="date" className="hp-input" value={denNgay} onChange={(e) => setDenNgay(e.target.value)} />
        </div>
        <button onClick={xemSo} disabled={loading} className="hp-btn-primary gap-1.5">
          <Search size={14} /> {loading ? "Đang tải..." : "Xem sổ"}
        </button>
      </div>

      {err && <p className="text-sm text-hp-danger">{err}</p>}

      {rows && (
        <div className="border border-hp-border rounded-hp-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-hp-surface text-hp-text-muted text-xs">
                <th className="px-3 py-2 text-left w-28">Ngày</th>
                <th className="px-3 py-2 text-left w-28">Loại</th>
                <th className="px-3 py-2 text-left">Số chứng từ</th>
                <th className="px-3 py-2 text-right w-20">Nhập</th>
                <th className="px-3 py-2 text-right w-20">Xuất</th>
                <th className="px-3 py-2 text-right w-24">Tồn sau</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-hp-text-muted text-sm">
                    Chưa có giao dịch nào cho mặt hàng này trong khoảng lọc
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const info = LOAI_GIAO_DICH_LABEL[r.transactionType] || { label: r.transactionType, color: "text-hp-text-muted" };
                  return (
                    <tr key={i} className="border-t border-hp-border">
                      <td className="px-3 py-2 text-hp-text-muted text-xs">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</td>
                      <td className={`px-3 py-2 text-xs font-medium ${info.color}`}>{info.label}</td>
                      <td className="px-3 py-2 text-hp-primary font-mono text-xs">{r.refId}</td>
                      <td className="px-3 py-2 text-right text-hp-success">{r.direction === 1 ? `+${r.soLuong}` : ""}</td>
                      <td className="px-3 py-2 text-right text-hp-danger">{r.direction === -1 ? `-${r.soLuong}` : ""}</td>
                      <td className="px-3 py-2 text-right font-medium text-hp-text">{r.stockAfter}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const SUB_TABS = [
  { key: "nxt", label: "Nhập-Xuất-Tồn", icon: BarChart3 },
  { key: "donvi", label: "Xuất theo Phòng ban/Công trình", icon: Users2 },
  { key: "sct", label: "Sổ chi tiết mặt hàng", icon: BookOpen },
] as const;

export function BaoCaoTab({ khoId = "", khoList = [] }: { khoId?: string; khoList?: KhoRow[] }) {
  const [subTab, setSubTab] = useState<(typeof SUB_TABS)[number]["key"]>("nxt");

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
        <button onClick={() => setSubTab(subTab)} className="hp-btn-ghost ml-auto self-center p-1.5" title="Làm mới">
          <RefreshCw size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {subTab === "nxt" && <NhapXuatTonReport khoList={khoList} defaultKhoId={khoId} />}
        {subTab === "donvi" && <XuatTheoDonViReport khoList={khoList} defaultKhoId={khoId} />}
        {subTab === "sct" && <SoChiTietReport khoList={khoList} defaultKhoId={khoId} />}
      </div>
    </div>
  );
}
