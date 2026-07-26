"use client";

import { useEffect, useState } from "react";
import { Save, RefreshCw, Shield, Clock, Key, MonitorSmartphone, AlertTriangle, type LucideIcon } from "lucide-react";
import { api } from "@/lib/apiClient";

interface SettingMeta {
  label: string;
  type: "number" | "boolean";
  min?: number;
  max?: number;
  icon: LucideIcon;
}

const SETTING_META: Record<string, SettingMeta> = {
  password_min_length: { label: "Độ dài mật khẩu tối thiểu", type: "number", min: 4, max: 32, icon: Key },
  jwt_expire_minutes: { label: "Thời gian hết hạn JWT (phút)", type: "number", min: 30, icon: Clock },
  session_timeout_minutes: { label: "Timeout phiên đăng nhập (phút)", type: "number", min: 5, icon: Clock },
  allow_multi_device: { label: "Cho phép đăng nhập nhiều thiết bị", type: "boolean", icon: MonitorSmartphone },
  max_login_attempts: { label: "Số lần đăng nhập sai tối đa", type: "number", min: 3, max: 20, icon: AlertTriangle },
  lockout_duration_minutes: { label: "Thời gian khóa sau khi sai quá số lần (phút)", type: "number", min: 1, icon: Clock },
  require_password_change: { label: "Yêu cầu đổi mật khẩu lần đầu đăng nhập", type: "boolean", icon: Key },
};

type SettingsMap = Record<string, string>;

export default function IAMSettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [original, setOriginal] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ settings: { key: string; value: string }[] }>("/iam/settings");
      const map: SettingsMap = {};
      (res.settings || []).forEach((s) => {
        map[s.key] = s.value;
      });
      setSettings(map);
      setOriginal(map);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Lỗi tải cài đặt" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function set(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
      await api.put("/iam/settings", updates);
      setOriginal({ ...settings });
      setMsg({ ok: true, text: "Đã lưu cài đặt bảo mật" });
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Lỗi lưu" });
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = Object.keys(settings).some((k) => settings[k] !== original[k]);

  function renderField(key: string, meta: SettingMeta) {
    const val = settings[key] ?? "";
    const Icon = meta.icon;

    if (meta.type === "boolean") {
      const checked = val === "true";
      return (
        <div key={key} className="flex items-center justify-between p-4 rounded-hp-md border border-hp-border hover:border-hp-border/80 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-hp-md bg-hp-surface flex items-center justify-center">
              <Icon size={14} className="text-hp-text-muted" />
            </div>
            <p className="text-sm text-hp-text">{meta.label}</p>
          </div>
          <button onClick={() => set(key, checked ? "false" : "true")} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-hp-primary" : "bg-hp-border"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      );
    }

    return (
      <div key={key} className="flex items-center justify-between p-4 rounded-hp-md border border-hp-border hover:border-hp-border/80 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-hp-md bg-hp-surface flex items-center justify-center">
            <Icon size={14} className="text-hp-text-muted" />
          </div>
          <p className="text-sm text-hp-text">{meta.label}</p>
        </div>
        <input type="number" className="hp-input w-24 text-right" min={meta.min} max={meta.max} value={val} onChange={(e) => set(key, e.target.value)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-hp-text flex items-center gap-2">
            <Shield size={18} className="text-hp-primary" /> Cài đặt Bảo mật
          </h1>
          <p className="text-sm text-hp-text-muted mt-0.5">Cấu hình chính sách mật khẩu và phiên đăng nhập</p>
        </div>
        <button onClick={load} className="hp-btn-ghost">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={20} className="animate-spin text-hp-primary" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">{Object.entries(SETTING_META).map(([key, meta]) => renderField(key, meta))}</div>

          <div className="p-4 rounded-hp-md bg-hp-warning/5 border border-hp-warning/30">
            <p className="text-xs text-hp-warning flex items-start gap-2">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Thay đổi JWT Expire hoặc Session Timeout sẽ ảnh hưởng đến các phiên đăng nhập hiện tại. Người dùng sẽ cần đăng nhập lại khi token hết hạn.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving || !hasChanges} className="hp-btn-primary disabled:opacity-40">
              <Save size={14} /> {saving ? "Đang lưu..." : "Lưu cài đặt"}
            </button>
            {hasChanges && (
              <button onClick={() => setSettings({ ...original })} className="hp-btn-secondary">
                Hoàn tác
              </button>
            )}
            {msg && <span className={`text-sm ${msg.ok ? "text-hp-success" : "text-hp-danger"}`}>{msg.text}</span>}
          </div>
        </>
      )}
    </div>
  );
}
