"use client";

/** HangHoaMuaHangInput — autocomplete mã/tên hàng cho danh mục purchasing_hang_hoa (độc lập với Hàng hóa theo kho bên phân hệ Kho). */
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";
import type { HangHoaMuaHang } from "@/lib/types/purchasing";

export function HangHoaMuaHangInput({
  value = "",
  field = "ten",
  onChange,
  onTextChange,
  placeholder = "",
  className = "",
}: {
  value?: string;
  field?: "ma" | "ten";
  onChange?: (hh: HangHoaMuaHang) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const [suggestions, setSuggs] = useState<HangHoaMuaHang[]>([]);
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

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggs([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<{ items: HangHoaMuaHang[] }>(`/purchasing/hang-hoa?search=${encodeURIComponent(q)}`);
      const items = (res.items || []).slice(0, 10);
      setSuggs(items);
      setOpen(items.length > 0);
    } catch {
      setSuggs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setText(val);
    onTextChange?.(val);
    setHigh(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  }

  function handleSelect(hh: HangHoaMuaHang) {
    setText(field === "ma" ? hh.ma : hh.ten);
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
              key={hh.ma}
              onMouseDown={() => handleSelect(hh)}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 text-sm transition-colors ${
                i === highlighted ? "bg-hp-primary/20 text-hp-primary" : "hover:bg-hp-surface text-hp-text"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-hp-primary shrink-0 w-24 truncate">{hh.ma}</span>
                <span className="truncate">{hh.ten}</span>
              </div>
              <span className="text-xs text-hp-text-muted shrink-0">{hh.donViTinh}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
