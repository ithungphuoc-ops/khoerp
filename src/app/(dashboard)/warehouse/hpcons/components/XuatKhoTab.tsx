"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Search, RefreshCw, Trash2, ChevronLeft, ChevronRight, ArrowUpFromLine, X, Save, Printer, Package, Edit2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/apiClient";
import { HangHoaInput } from "./HangHoaInput";
import { EntityAutocomplete } from "./EntityAutocomplete";
import { emptyChiTietRow, chiTietToBody, type KhoRow, type HangHoaRow, type ChiTietRow } from "./types";

interface PhieuXuatForm {
  ngay_hach_toan: string;
  ngay_chung_tu: string;
  kho_id: string;
  nguoi_nhan: string;
  dia_chi: string;
  nhan_vien_xuat: string;
  ly_do_xuat: string;
  phong_ban: string;
  cong_trinh: string;
  ghi_chu: string;
}

interface PhieuXuatListItem {
  soChungTu: string;
  ngayHachToan: string;
  nguoiNhan?: string;
  congTrinh?: string;
  lyDoXuat: string;
  tongTien: number;
  trangThai: string;
  kho: { maKho: string; tenKho: string } | null;
}

interface PhieuXuatDetail {
  soChungTu: string;
  ngayHachToan: string;
  ngayChungTu: string;
  khoId: string;
  nguoiNhan?: string;
  diaChi?: string;
  nhanVienXuat?: string;
  lyDoXuat: string;
  phongBan?: string;
  congTrinh?: string;
  ghiChu?: string;
  tongTien: number;
  trangThai: string;
  chiTiet: ChiTietRow[] | null;
  kho: { maKho: string; tenKho: string } | null;
}

function KhoSearchSelect({ khoList, value, onChange }: { khoList: KhoRow[]; value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = khoList.find((k) => k.maKho === value);
  const filtered = khoList.filter((k) => !query || k.tenKho.toLowerCase().includes(query.toLowerCase()) || k.maKho.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <input
        className="hp-input w-full"
        placeholder="-- Chọn kho --"
        value={open ? query : selected?.tenKho || ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-hp-surface border border-hp-border rounded-hp-md shadow-xl max-h-48 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-hp-text-muted">Không tìm thấy kho</div>
          ) : (
            filtered.map((k) => (
              <div
                key={k.maKho}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-hp-primary/10 ${value === k.maKho ? "text-hp-primary font-medium" : "text-hp-text"}`}
                onMouseDown={() => {
                  onChange(k.maKho);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="font-medium">{k.tenKho}</span>
                <span className="ml-2 text-xs text-hp-text-muted">{k.maKho}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PrintModal({ form, chiTiet, khoList, onClose }: { form: PhieuXuatForm; chiTiet: ChiTietRow[]; khoList: KhoRow[]; onClose: () => void }) {
  const kho = khoList.find((k) => k.maKho === form.kho_id);
  const tongTien = (chiTiet || []).reduce((s, r) => s + (r.thanhTien || 0), 0);
  const today = new Date().toLocaleDateString("vi-VN");

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white text-gray-900 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-lg shadow-2xl overflow-hidden">
        <div className="print:hidden flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
          <span className="text-sm font-medium text-gray-700">Xem trước phiếu xuất kho</span>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              <Printer size={14} /> In phiếu
            </button>
            <button onClick={onClose} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300">
              Đóng
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8 print:p-4">
          <div className="text-center mb-4">
            <p className="text-xs uppercase tracking-widest text-gray-500">HP CONS</p>
            <h1 className="text-xl font-bold uppercase mt-1">Phiếu Xuất Kho</h1>
            <p className="text-xs text-gray-500 mt-0.5">Ngày in: {today}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 mb-4 text-sm">
            <div>
              <span className="text-gray-500">Kho:</span> <strong>{kho?.tenKho || "—"}</strong>
            </div>
            <div>
              <span className="text-gray-500">Ngày hạch toán:</span> <strong>{new Date(form.ngay_hach_toan).toLocaleDateString("vi-VN")}</strong>
            </div>
            <div>
              <span className="text-gray-500">Người nhận:</span> <strong>{form.nguoi_nhan || "—"}</strong>
            </div>
            <div>
              <span className="text-gray-500">Phòng ban:</span> <strong>{form.phong_ban || "—"}</strong>
            </div>
            <div>
              <span className="text-gray-500">Công trình:</span> <strong>{form.cong_trinh || "—"}</strong>
            </div>
            <div>
              <span className="text-gray-500">Diễn giải:</span> <strong>{form.ly_do_xuat || "—"}</strong>
            </div>
          </div>
          <table className="w-full border-collapse text-sm mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1.5 text-center w-8">#</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left w-24">Mã hàng</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left">Tên hàng</th>
                <th className="border border-gray-300 px-2 py-1.5 text-center w-16">TK Nợ</th>
                <th className="border border-gray-300 px-2 py-1.5 text-center w-16">TK Có</th>
                <th className="border border-gray-300 px-2 py-1.5 text-center w-16">ĐVT</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right w-20">Số lượng</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right w-28">Đơn giá</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right w-28">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {(chiTiet || []).map((row, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1 text-center text-gray-500">{i + 1}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.maHang}</td>
                  <td className="border border-gray-300 px-2 py-1">{row.tenHang}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{row.tkNo || ""}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{row.tkCo || ""}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{row.donViTinh}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{row.soLuong}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{(row.donGia || 0).toLocaleString("vi-VN")}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{(row.thanhTien || 0).toLocaleString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={8} className="border border-gray-300 px-2 py-1.5 text-right">
                  Tổng cộng:
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{tongTien.toLocaleString("vi-VN")} đ</td>
              </tr>
            </tfoot>
          </table>
          <div className="grid grid-cols-3 gap-4 mt-8 text-center text-sm">
            {["Người lập phiếu", "Thủ kho", "Người nhận"].map((name) => (
              <div key={name}>
                <p className="font-medium">{name}</p>
                <p className="text-xs text-gray-400 mt-1">(Ký, ghi rõ họ tên)</p>
                <div className="mt-12 border-t border-gray-400 pt-1 text-gray-500 text-xs">Họ và tên</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhieuModal({ khoList, phieu, onClose, onSaved }: { khoList: KhoRow[]; phieu: PhieuXuatDetail | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!phieu;
  const today = new Date().toISOString().slice(0, 10);
  const [showPrint, setShowPrint] = useState(false);
  const [savedForm, setSavedForm] = useState<PhieuXuatForm | null>(null);
  const [savedCT, setSavedCT] = useState<ChiTietRow[] | null>(null);

  const [form, setForm] = useState<PhieuXuatForm>(() =>
    isEdit
      ? {
          ngay_hach_toan: phieu.ngayHachToan?.slice(0, 10) || today,
          ngay_chung_tu: phieu.ngayChungTu?.slice(0, 10) || today,
          kho_id: phieu.khoId || "",
          nguoi_nhan: phieu.nguoiNhan || "",
          dia_chi: phieu.diaChi || "",
          nhan_vien_xuat: phieu.nhanVienXuat || "",
          ly_do_xuat: phieu.lyDoXuat || "Xuất kho bán hàng",
          phong_ban: phieu.phongBan || "",
          cong_trinh: phieu.congTrinh || "",
          ghi_chu: phieu.ghiChu || "",
        }
      : {
          ngay_hach_toan: today,
          ngay_chung_tu: today,
          kho_id: khoList[0]?.maKho || "",
          nguoi_nhan: "",
          dia_chi: "",
          nhan_vien_xuat: "",
          ly_do_xuat: "Xuất kho bán hàng",
          phong_ban: "",
          cong_trinh: "",
          ghi_chu: "",
        }
  );

  const [chiTiet, setChiTiet] = useState<ChiTietRow[]>(() => (isEdit && phieu.chiTiet?.length ? phieu.chiTiet.map((r) => ({ ...r })) : [emptyChiTietRow(1)]));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    if (type === "success") setTimeout(() => setToast(null), 3000);
  }

  function set<K extends keyof PhieuXuatForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function updateCT<K extends keyof ChiTietRow>(i: number, k: K, v: ChiTietRow[K]) {
    setChiTiet((prev) => {
      const rows = [...prev];
      rows[i] = { ...rows[i], [k]: v };
      if (k === "soLuong" || k === "donGia") {
        rows[i].thanhTien = (Number(rows[i].soLuong) || 0) * (Number(rows[i].donGia) || 0);
      }
      return rows;
    });
  }

  function handleSelectHH(i: number, hh: HangHoaRow) {
    setChiTiet((prev) => {
      const rows = [...prev];
      const sl = Number(rows[i].soLuong) || 1;
      const dg = hh.giaNhap || 0;
      rows[i] = { ...rows[i], hangHoaId: hh.maHang, maHang: hh.maHang, tenHang: hh.tenHang, donViTinh: hh.donViTinh || "", donGia: dg, thanhTien: sl * dg, tonKhoHienTai: hh.tonKho ?? 0 };
      return rows;
    });
  }

  function addRow() {
    setChiTiet((prev) => [...prev, emptyChiTietRow(prev.length + 1)]);
  }
  function removeRow(i: number) {
    setChiTiet((prev) => prev.filter((_, idx) => idx !== i));
  }
  const tongTien = chiTiet.reduce((s, r) => s + (r.thanhTien || 0), 0);

  // Khi đổi kho xuất sau khi đã chọn hàng — refresh lại tồn kho hiện tại cho
  // đúng kho mới (tồn kho hiển thị trước đó là của kho cũ, không còn đúng).
  useEffect(() => {
    if (!form.kho_id) return;
    const rowsWithHang = chiTiet.map((r, i) => ({ i, maHang: r.hangHoaId })).filter((r) => r.maHang);
    if (rowsWithHang.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const { i, maHang } of rowsWithHang) {
        try {
          const res = await api.get<{ items: HangHoaRow[] }>(`/warehouse/hang-hoa?ma_hang=${encodeURIComponent(maHang!)}&kho_id=${encodeURIComponent(form.kho_id)}`);
          const tonKho = res.items?.[0]?.tonKho ?? 0;
          if (cancelled) return;
          setChiTiet((prev) => {
            const rows = [...prev];
            if (rows[i]) rows[i] = { ...rows[i], tonKhoHienTai: tonKho };
            return rows;
          });
        } catch {
          // ignore
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.kho_id]);

  async function handleSave(withPrint = false) {
    if (!form.kho_id) return showToast("error", "Vui lòng chọn kho xuất");
    const overLimit = chiTiet.find((r) => r.tonKhoHienTai !== undefined && r.soLuong > r.tonKhoHienTai);
    if (overLimit) return showToast("error", `Hàng "${overLimit.tenHang}" chỉ còn tồn ${overLimit.tonKhoHienTai} — vượt quá số lượng xuất`);
    setSaving(true);
    setToast(null);
    try {
      const body = { ...form, chi_tiet: chiTietToBody(chiTiet) };
      if (isEdit) {
        await api.put(`/warehouse/xuat-kho/${phieu.soChungTu}`, body);
      } else {
        await api.post("/warehouse/xuat-kho", body);
      }
      if (withPrint) {
        setSavedForm(form);
        setSavedCT(chiTiet);
        setShowPrint(true);
      } else {
        showToast("success", isEdit ? "Cập nhật phiếu xuất thành công!" : "Lưu phiếu xuất thành công!");
        setTimeout(() => onSaved(), 1200);
      }
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Lỗi lưu phiếu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-hp-bg border border-hp-border rounded-hp-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-hp-border">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine size={16} className="text-hp-danger" />
            <span className="font-semibold text-hp-text">{isEdit ? `Sửa phiếu xuất — ${phieu.soChungTu}` : "Tạo phiếu xuất kho"}</span>
          </div>
          <button onClick={onClose} className="hp-btn-ghost p-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Kho xuất *</label>
              <KhoSearchSelect khoList={khoList} value={form.kho_id} onChange={(v) => set("kho_id", v)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Người nhận</label>
              <input className="hp-input w-full" value={form.nguoi_nhan} onChange={(e) => set("nguoi_nhan", e.target.value)} placeholder="Tên người nhận hàng" />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Phòng ban</label>
              <EntityAutocomplete
                apiPath="/warehouse/phong-ban"
                value={form.phong_ban}
                onChange={(row) => set("phong_ban", row.ten)}
                onTextChange={(v) => set("phong_ban", v)}
                placeholder="Phòng ban / Đội"
              />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Diễn giải</label>
              <input className="hp-input w-full" value={form.ly_do_xuat} onChange={(e) => set("ly_do_xuat", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Công trình</label>
              <EntityAutocomplete
                apiPath="/warehouse/cong-trinh"
                value={form.cong_trinh}
                onChange={(row) => set("cong_trinh", row.ten)}
                onTextChange={(v) => set("cong_trinh", v)}
                placeholder="Tên công trình"
              />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Nhân viên xuất</label>
              <input className="hp-input w-full" value={form.nhan_vien_xuat} onChange={(e) => set("nhan_vien_xuat", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Ngày hạch toán</label>
              <input type="date" className="hp-input w-full" value={form.ngay_hach_toan} onChange={(e) => set("ngay_hach_toan", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-hp-text-muted mb-1 block">Ngày chứng từ</label>
              <input type="date" className="hp-input w-full" value={form.ngay_chung_tu} onChange={(e) => set("ngay_chung_tu", e.target.value)} />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-hp-text-muted mb-2 uppercase tracking-wide">Hàng xuất</p>
            <div className="border border-hp-border rounded-hp-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-hp-surface text-hp-text-muted text-xs">
                    <th className="px-2 py-2 text-left w-8">#</th>
                    <th className="px-2 py-2 text-left w-28">Mã hàng</th>
                    <th className="px-2 py-2 text-left">Tên hàng</th>
                    <th className="px-2 py-2 text-center w-16">TK Nợ</th>
                    <th className="px-2 py-2 text-center w-16">TK Có</th>
                    <th className="px-2 py-2 text-center w-14">ĐVT</th>
                    <th className="px-2 py-2 text-right w-20">Số lượng</th>
                    <th className="px-2 py-2 text-right w-28">Đơn giá</th>
                    <th className="px-2 py-2 text-right w-28">Thành tiền</th>
                    <th className="w-7"></th>
                  </tr>
                </thead>
                <tbody>
                  {chiTiet.map((row, i) => (
                    <tr key={i} className="border-t border-hp-border hover:bg-hp-surface/50">
                      <td className="px-2 py-1 text-hp-text-muted text-xs">{i + 1}</td>
                      <td className="px-2 py-1">
                        <HangHoaInput value={row.maHang || ""} field="maHang" khoId={form.kho_id} onChange={(hh) => handleSelectHH(i, hh)} onTextChange={(v) => updateCT(i, "maHang", v)} />
                      </td>
                      <td className="px-2 py-1">
                        <HangHoaInput
                          value={row.tenHang || ""}
                          field="tenHang"
                          placeholder="Tên hàng hóa"
                          khoId={form.kho_id}
                          onChange={(hh) => handleSelectHH(i, hh)}
                          onTextChange={(v) => updateCT(i, "tenHang", v)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <EntityAutocomplete
                          apiPath="/warehouse/tai-khoan"
                          selectField="ma"
                          dropdownMinWidth={220}
                          className="text-center"
                          value={row.tkNo || ""}
                          placeholder="331"
                          onChange={(acc) => updateCT(i, "tkNo", acc.ma)}
                          onTextChange={(v) => updateCT(i, "tkNo", v)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <EntityAutocomplete
                          apiPath="/warehouse/tai-khoan"
                          selectField="ma"
                          dropdownMinWidth={220}
                          className="text-center"
                          value={row.tkCo || ""}
                          placeholder="152"
                          onChange={(acc) => updateCT(i, "tkCo", acc.ma)}
                          onTextChange={(v) => updateCT(i, "tkCo", v)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input className="hp-input w-full py-0.5 text-center" value={row.donViTinh || ""} onChange={(e) => updateCT(i, "donViTinh", e.target.value)} />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          className={`hp-input w-full py-0.5 text-right ${row.tonKhoHienTai !== undefined && row.soLuong > row.tonKhoHienTai ? "border-hp-danger text-hp-danger" : ""}`}
                          value={row.soLuong}
                          onChange={(e) => updateCT(i, "soLuong", Number(e.target.value))}
                        />
                        {row.tonKhoHienTai !== undefined && (
                          <div className={`text-[10px] text-right mt-0.5 ${row.soLuong > row.tonKhoHienTai ? "text-hp-danger font-medium" : "text-hp-text-muted"}`}>
                            Tồn: {row.tonKhoHienTai}
                            {row.soLuong > row.tonKhoHienTai && " — vượt tồn kho!"}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" className="hp-input w-full py-0.5 text-right" value={row.donGia} onChange={(e) => updateCT(i, "donGia", Number(e.target.value))} />
                      </td>
                      <td className="px-2 py-1 text-right text-hp-text">{(row.thanhTien || 0).toLocaleString("vi-VN")}</td>
                      <td className="px-1 py-1">
                        <button onClick={() => removeRow(i)} className="text-hp-text-muted hover:text-hp-danger">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-hp-border bg-hp-surface">
                    <td colSpan={9} className="px-2 py-2 text-right text-sm font-semibold text-hp-text">
                      Tổng: {tongTien.toLocaleString("vi-VN")} đ
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button onClick={addRow} className="mt-2 hp-btn-ghost text-xs gap-1">
              <Plus size={12} /> Thêm dòng
            </button>
          </div>

          <div>
            <label className="text-xs text-hp-text-muted mb-1 block">Ghi chú</label>
            <textarea className="hp-input w-full" rows={2} value={form.ghi_chu} onChange={(e) => set("ghi_chu", e.target.value)} />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-hp-border flex items-center justify-between">
          <button onClick={onClose} className="hp-btn-secondary">
            Hủy
          </button>
          {toast && (
            <div className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-hp-md ${toast.type === "success" ? "bg-hp-success/15 text-hp-success" : "bg-hp-danger/15 text-hp-danger"}`}>
              {toast.type === "success" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {toast.msg}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving} className="hp-btn-secondary gap-1.5">
              <Save size={14} /> {saving ? "Đang lưu..." : "Cất"}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="hp-btn-primary gap-1.5">
              <Printer size={14} /> {saving ? "Đang lưu..." : "Cất và In"}
            </button>
          </div>
        </div>
      </div>

      {showPrint && savedForm && savedCT && (
        <PrintModal
          form={savedForm}
          chiTiet={savedCT}
          khoList={khoList}
          onClose={() => {
            setShowPrint(false);
            onSaved();
          }}
        />
      )}
    </div>
  );
}

function DetailPanel({ phieu, onClose, onEdit, onDelete }: { phieu: PhieuXuatDetail; onClose: () => void; onEdit: () => void; onDelete: () => Promise<void> }) {
  const kho = phieu.kho;
  const chiTiet = phieu.chiTiet;
  const tongTien = (chiTiet || []).reduce((s, r) => s + (r.thanhTien || 0), 0);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-hp-border bg-hp-surface/50">
        <div className="flex items-center gap-2">
          <ArrowUpFromLine size={14} className="text-hp-danger" />
          <span className="text-sm font-semibold text-hp-text">Phiếu xuất kho — {phieu.soChungTu}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${phieu.trangThai === "da_duyet" ? "bg-hp-success/20 text-hp-success" : "bg-hp-warning/20 text-hp-warning"}`}>
            {phieu.trangThai === "da_duyet" ? "Đã duyệt" : "Nháp"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="hp-btn-ghost px-2 py-1 text-xs gap-1 text-hp-primary">
            <Edit2 size={12} /> Sửa
          </button>
          <button onClick={() => setConfirmDel(true)} className="hp-btn-ghost px-2 py-1 text-xs gap-1 text-hp-danger">
            <Trash2 size={12} /> Xóa
          </button>
          <button onClick={onClose} className="hp-btn-ghost p-1 text-hp-text-muted hover:text-hp-text">
            <X size={14} />
          </button>
        </div>
      </div>

      {confirmDel && (
        <div className="mx-4 mt-3 flex items-center gap-3 bg-hp-danger/10 border border-hp-danger/30 rounded-hp-md px-4 py-3">
          <AlertTriangle size={16} className="text-hp-danger shrink-0" />
          <span className="text-sm text-hp-danger flex-1">
            Xóa phiếu <strong>{phieu.soChungTu}</strong>? Tồn kho sẽ được hoàn lại.
          </span>
          <button onClick={() => setConfirmDel(false)} className="hp-btn-ghost text-xs px-2 py-1">
            Hủy
          </button>
          <button onClick={handleDelete} disabled={deleting} className="bg-hp-danger text-white text-xs px-3 py-1.5 rounded-hp-md hover:opacity-90 disabled:opacity-50">
            {deleting ? "Đang xóa..." : "Xác nhận xóa"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            { label: "Kho xuất", value: kho?.tenKho || kho?.maKho || "—" },
            { label: "Ngày hạch toán", value: phieu.ngayHachToan ? new Date(phieu.ngayHachToan).toLocaleDateString("vi-VN") : "—" },
            { label: "Người nhận", value: phieu.nguoiNhan || "—" },
            { label: "Phòng ban", value: phieu.phongBan || "—" },
            { label: "Công trình", value: phieu.congTrinh || "—" },
            { label: "Diễn giải", value: phieu.lyDoXuat || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-hp-surface rounded-hp-md p-3">
              <p className="text-xs text-hp-text-muted mb-0.5">{label}</p>
              <p className="text-hp-text font-medium">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-hp-text-muted mb-2 uppercase tracking-wide">Hàng xuất</p>
          <div className="border border-hp-border rounded-hp-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-hp-surface text-hp-text-muted text-xs">
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left w-24">Mã hàng</th>
                  <th className="px-3 py-2 text-left">Tên hàng</th>
                  <th className="px-3 py-2 text-center w-16">TK Nợ</th>
                  <th className="px-3 py-2 text-center w-16">TK Có</th>
                  <th className="px-3 py-2 text-center w-16">ĐVT</th>
                  <th className="px-3 py-2 text-right w-20">Số lượng</th>
                  <th className="px-3 py-2 text-right w-28">Đơn giá</th>
                  <th className="px-3 py-2 text-right w-28">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {chiTiet === null ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center">
                      <RefreshCw size={14} className="animate-spin mx-auto text-hp-text-muted" />
                    </td>
                  </tr>
                ) : chiTiet.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-hp-text-muted text-xs">
                      Không có dòng hàng
                    </td>
                  </tr>
                ) : (
                  chiTiet.map((row, i) => (
                    <tr key={i} className="border-t border-hp-border hover:bg-hp-surface/50">
                      <td className="px-3 py-1.5 text-hp-text-muted text-xs">{i + 1}</td>
                      <td className="px-3 py-1.5 text-hp-text font-medium">{row.maHang || "—"}</td>
                      <td className="px-3 py-1.5 text-hp-text">{row.tenHang || "—"}</td>
                      <td className="px-3 py-1.5 text-center text-hp-text-muted">{row.tkNo || "—"}</td>
                      <td className="px-3 py-1.5 text-center text-hp-text-muted">{row.tkCo || "—"}</td>
                      <td className="px-3 py-1.5 text-center text-hp-text-muted">{row.donViTinh || "—"}</td>
                      <td className="px-3 py-1.5 text-right text-hp-text">{row.soLuong}</td>
                      <td className="px-3 py-1.5 text-right text-hp-text">{(row.donGia || 0).toLocaleString("vi-VN")}</td>
                      <td className="px-3 py-1.5 text-right text-hp-text font-medium">{(row.thanhTien || 0).toLocaleString("vi-VN")}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-hp-border bg-hp-surface">
                  <td colSpan={9} className="px-3 py-2 text-right text-sm font-semibold text-hp-text">
                    Tổng: {tongTien.toLocaleString("vi-VN")} đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function XuatKhoTab({ khoId = "", khoList = [] }: { khoId?: string; khoList?: KhoRow[] }) {
  const [items, setItems] = useState<PhieuXuatListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [panelMode, setPanelMode] = useState<"detail" | null>(null);
  const [selectedPhieu, setSelectedPhieu] = useState<PhieuXuatDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editPhieu, setEditPhieu] = useState<PhieuXuatDetail | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (khoId) params.set("kho_id", khoId);
      const res = await api.get<{ items: PhieuXuatListItem[]; total: number }>(`/warehouse/xuat-kho?${params}`);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, khoId]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(item: PhieuXuatListItem) {
    setSelectedPhieu({ ...(item as unknown as PhieuXuatDetail), chiTiet: null });
    setPanelMode("detail");
    try {
      const detail = await api.get<PhieuXuatDetail>(`/warehouse/xuat-kho/${item.soChungTu}`);
      setSelectedPhieu(detail);
    } catch (e) {
      console.error(e);
      setSelectedPhieu((prev) => (prev ? { ...prev, chiTiet: [] } : prev));
    }
  }

  async function openEdit() {
    if (!selectedPhieu) return;
    if (selectedPhieu.chiTiet === null) {
      try {
        const detail = await api.get<PhieuXuatDetail>(`/warehouse/xuat-kho/${selectedPhieu.soChungTu}`);
        setEditPhieu(detail);
        setSelectedPhieu(detail);
      } catch (e) {
        console.error(e);
      }
    } else {
      setEditPhieu(selectedPhieu);
    }
  }

  async function handleDelete() {
    if (!selectedPhieu) return;
    await api.delete(`/warehouse/xuat-kho/${selectedPhieu.soChungTu}`);
    setPanelMode(null);
    setSelectedPhieu(null);
    load();
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedPhieu(null);
  }
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col border-b border-hp-border" style={{ minHeight: 0, flex: "0 0 auto", maxHeight: "55%" }}>
        <div className="flex items-center gap-2 flex-wrap px-4 py-3">
          <button onClick={() => setShowCreate(true)} className="hp-btn-primary gap-1.5 text-sm">
            <Plus size={14} /> Thêm phiếu xuất
          </button>
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hp-text-muted" />
            <input
              className="hp-input w-full pl-8"
              placeholder="Tìm số phiếu, người nhận, diễn giải..."
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

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-hp-surface text-hp-text-muted text-xs border-b border-hp-border">
                <th className="px-4 py-2.5 text-left">Ngày HT</th>
                <th className="px-4 py-2.5 text-left">Số chứng từ</th>
                <th className="px-4 py-2.5 text-left">Diễn giải</th>
                <th className="px-4 py-2.5 text-left">Kho</th>
                <th className="px-4 py-2.5 text-left">Người nhận / Công trình</th>
                <th className="px-4 py-2.5 text-right">Tổng tiền</th>
                <th className="px-4 py-2.5 text-center w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-hp-text-muted">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-1" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-hp-text-muted text-sm">
                    Chưa có phiếu xuất kho nào
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.soChungTu}
                    onClick={() => openDetail(item)}
                    className={`border-t border-hp-border hover:bg-hp-surface/50 cursor-pointer transition-colors ${
                      selectedPhieu?.soChungTu === item.soChungTu ? "bg-hp-primary/5 border-l-2 border-l-hp-primary" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{new Date(item.ngayHachToan).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-2.5 font-medium text-hp-danger">{item.soChungTu}</td>
                    <td className="px-4 py-2.5 text-hp-text">{item.lyDoXuat}</td>
                    <td className="px-4 py-2.5 text-hp-text-muted text-xs">{item.kho?.tenKho || item.kho?.maKho || "—"}</td>
                    <td className="px-4 py-2.5 text-hp-text text-xs">{item.nguoiNhan || item.congTrinh || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-hp-text">{(item.tongTien || 0).toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-2.5 text-center">
                      {item.trangThai === "da_duyet" ? <CheckCircle2 size={15} className="mx-auto text-hp-success" /> : <XCircle size={15} className="mx-auto text-hp-danger" />}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-2 text-xs text-hp-text-muted border-t border-hp-border">
          <span>Tổng số: {total} bản ghi</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="hp-btn-ghost p-1 disabled:opacity-40">
                <ChevronLeft size={12} />
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="hp-btn-ghost p-1 disabled:opacity-40">
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {panelMode === null && (
          <div className="flex flex-col items-center justify-center h-full text-hp-text-muted gap-3">
            <Package size={32} className="opacity-30" />
            <p className="text-sm">Chọn phiếu để xem chi tiết</p>
          </div>
        )}
        {panelMode === "detail" && selectedPhieu && <DetailPanel phieu={selectedPhieu} onClose={closePanel} onEdit={openEdit} onDelete={handleDelete} />}
      </div>

      {showCreate && (
        <PhieuModal
          khoList={khoList}
          phieu={null}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {editPhieu && (
        <PhieuModal
          khoList={khoList}
          phieu={editPhieu}
          onClose={() => setEditPhieu(null)}
          onSaved={() => {
            setEditPhieu(null);
            load();
            if (selectedPhieu) {
              api
                .get<PhieuXuatDetail>(`/warehouse/xuat-kho/${selectedPhieu.soChungTu}`)
                .then((d) => setSelectedPhieu(d))
                .catch(() => {});
            }
          }}
        />
      )}
    </div>
  );
}
