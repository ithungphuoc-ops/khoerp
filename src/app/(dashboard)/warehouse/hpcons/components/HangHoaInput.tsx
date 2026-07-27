"use client";

/**
 * HangHoaInput — Autocomplete cho mã hàng / tên hàng.
 * Gõ 2+ ký tự → hiện dropdown danh sách → chọn → fill đủ fields.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";
import type { HangHoaRow } from "./types";

export function HangHoaInput({
  value = "",
  field = "tenHang",
  onChange,
  onTextChange,
  readOnly = false,
  placeholder = "",
  className = "",
  khoId = "",
}: {
  value?: string;
  field?: "maHang" | "tenHang";
  onChange?: (hh: HangHoaRow) => void;
  onTextChange?: (text: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  /** Kho đang thao tác — khi có, dropdown gợi ý hiện kèm tồn kho hiện tại tại kho này. */
  khoId?: string;
}) {
  const [text, setText] = useState(value);
  const [suggestions, setSuggs] = useState<HangHoaRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHigh] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setSuggs([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const khoParam = khoId ? `&kho_id=${encodeURIComponent(khoId)}` : "";
        const res = await api.get<{ items: HangHoaRow[] }>(`/warehouse/hang-hoa?search=${encodeURIComponent(q)}&limit=10&active=true${khoParam}`);
        const items = res.items || [];
        setSuggs(items);
        setOpen(items.length > 0);
      } catch {
        setSuggs([]);
      } finally {
        setLoading(false);
      }
    },
    [khoId]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setText(val);
    onTextChange?.(val);
    setHigh(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  }

  function handleSelect(hh: HangHoaRow) {
    setText(field === "maHang" ? hh.maHang : hh.tenHang);
    setSuggs([]);
    setOpen(false);
    onChange?.(hh);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHigh((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHigh((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (readOnly) {
    return <input className={`hp-input ${className}`} value={text} readOnly />;
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        className={`hp-input w-full ${className}`}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => text.length >= 2 && suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />

      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="w-3 h-3 border border-hp-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-hp-bg border border-hp-border rounded-hp-md shadow-xl max-h-52 overflow-auto">
          {suggestions.map((hh, i) => (
            <div
              key={hh.maHang}
              onMouseDown={() => handleSelect(hh)}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 text-sm transition-colors ${
                i === highlighted ? "bg-hp-primary/20 text-hp-primary" : "hover:bg-hp-surface text-hp-text"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-hp-primary shrink-0 w-24 truncate">{hh.maHang}</span>
                <span className="truncate">{hh.tenHang}</span>
              </div>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-hp-text-muted">{hh.donViTinh}</span>
                {khoId && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${(hh.tonKho ?? 0) > 0 ? "bg-hp-success/15 text-hp-success" : "bg-hp-danger/15 text-hp-danger"}`}>
                    Tồn: {hh.tonKho ?? 0}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
