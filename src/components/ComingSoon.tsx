import { Zap, type LucideIcon } from "lucide-react";

export function ComingSoon({ title = "Phân hệ", icon: Icon = Zap, color = "#6366f1" }: { title?: string; icon?: LucideIcon; color?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 animate-fadeIn">
      <div className="w-16 h-16 rounded-hp-xl flex items-center justify-center mb-5" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={28} style={{ color }} />
      </div>
      <h2 className="text-xl font-semibold text-hp-text mb-2">{title}</h2>
      <p className="text-sm text-hp-text-muted text-center max-w-sm">Phân hệ này đang được phát triển và sẽ ra mắt trong thời gian sắp tới.</p>
      <div className="mt-6 px-4 py-2 rounded-full bg-hp-surface border border-hp-border text-xs text-hp-text-disabled">Coming soon</div>
    </div>
  );
}
