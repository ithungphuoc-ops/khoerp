"use client";

/**
 * EntityAutocomplete — ô tìm-gõ-là-ra dùng chung cho các danh mục đơn giản
 * dạng {ma, ten} (Phòng ban, Công trình...). Cùng UX với HangHoaInput
 * (gõ 2+ ký tự → hiện gợi ý → chọn → điền đủ) nhưng không cần các field đặc
 * thù của hàng hóa (đơn vị tính, tồn kho theo kho).
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";

export interface EntityRow {
  ma: string;
  ten: string;
  [key: string]: unknown;
}

export function EntityAutocomplete({
  value = "",
  apiPath,
  onChange,
  onTextChange,
  placeholder = "",
  className = "",
}: {
  value?: string;
  /** Đường dẫn API danh mục, vd "/warehouse/phong-ban" — phải trả về { items: EntityRow[] }. */
  apiPath: string;
  onChange?: (row: EntityRow) => void;
  onTextChange?: (text: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const [suggestions, setSuggs] = useState<EntityRow[]>([]);
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
        const res = await api.get<{ items: EntityRow[] }>(`${apiPath}?search=${encodeURIComponent(q)}`);
        const items = (res.items || []).slice(0, 10);
        setSuggs(items);
        setOpen(items.length > 0);
      } catch {
        setSuggs([]);
      } finally {
        setLoading(false);
      }
    },
    [apiPath]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setText(val);
    onTextChange?.(val);
    setHigh(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  }

  function handleSelect(row: EntityRow) {
    setText(row.ten);
    setSuggs([]);
    setOpen(false);
    onChange?.(row);
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
          {suggestions.map((row, i) => (
            <div
              key={row.ma}
              onMouseDown={() => handleSelect(row)}
              className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-sm transition-colors ${
                i === highlighted ? "bg-hp-primary/20 text-hp-primary" : "hover:bg-hp-surface text-hp-text"
              }`}
            >
              <span className="font-mono text-xs text-hp-primary shrink-0 w-16 truncate">{row.ma}</span>
              <span className="truncate">{row.ten}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
