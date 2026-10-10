import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  subLabel?: string;
  icon: LucideIcon;
  variant?: "cyan" | "emerald" | "amber" | "rose" | "default";
  trend?: "up" | "down" | "neutral";
  onClick?: () => void;
  isSelected?: boolean;
  isLoading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  subLabel,
  icon: Icon,
  variant = "default",
  onClick,
  isSelected = false,
  isLoading = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "cyan":
        return {
          iconColor: "text-cyan-400",
          iconBg: "bg-cyan-500/10 border-cyan-500/30",
          accentLine: "bg-cyan-400",
          glow: "group-hover:border-cyan-500/40",
          subTextColor: "text-cyan-400",
          selectedBorder: "border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.25)] bg-[#0b1626]/90",
          badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        };
      case "emerald":
        return {
          iconColor: "text-emerald-400",
          iconBg: "bg-emerald-500/10 border-emerald-500/30",
          accentLine: "bg-emerald-400",
          glow: "group-hover:border-emerald-500/40",
          subTextColor: "text-emerald-400",
          selectedBorder: "border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.25)] bg-[#091e1b]/90",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        };
      case "amber":
        return {
          iconColor: "text-amber-400",
          iconBg: "bg-amber-500/10 border-amber-500/30",
          accentLine: "bg-amber-400",
          glow: "group-hover:border-amber-500/40",
          subTextColor: "text-amber-400",
          selectedBorder: "border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.25)] bg-[#1e1709]/90",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        };
      case "rose":
        return {
          iconColor: "text-rose-400",
          iconBg: "bg-rose-500/10 border-rose-500/30",
          accentLine: "bg-rose-400",
          glow: "group-hover:border-rose-500/40",
          subTextColor: "text-rose-400",
          selectedBorder: "border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.25)] bg-[#200c14]/90",
          badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        };
      default:
        return {
          iconColor: "text-slate-400",
          iconBg: "bg-slate-800 border-slate-700",
          accentLine: "bg-slate-400",
          glow: "group-hover:border-slate-600",
          subTextColor: "text-slate-400",
          selectedBorder: "border-cyan-400/80 shadow-[0_0_20px_rgba(56,189,248,0.25)] bg-[#0f172a]/90",
          badgeColor: "bg-slate-700/50 text-slate-200 border-slate-600",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`glass-panel p-5 relative overflow-hidden transition-all duration-200 group ${
        onClick ? "cursor-pointer hover:-translate-y-0.5 active:scale-[0.98]" : ""
      } ${
        isSelected
          ? `${styles.selectedBorder} ring-1 ring-inset ${styles.selectedBorder.split(" ")[0]}`
          : styles.glow
      }`}
    >
      {/* Subtle corner telemetry accent */}
      <div className={`absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-white/[0.03] to-transparent pointer-events-none`} />
      <div className={`absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-${variant === 'default' ? 'slate-500' : styles.accentLine.replace('bg-', '')}/30 to-transparent`} />

      {isSelected && (
        <div className="absolute top-2 right-2">
          <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${styles.badgeColor}`}>
            Active
          </span>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase font-medium">
            {label}
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-9 w-16 bg-slate-800/80 rounded animate-pulse" />
            ) : (
              <span className="font-mono text-3xl font-bold tracking-tight text-white">
                {value}
              </span>
            )}
            {!isLoading && subValue && (
              <span className={`font-mono text-xs font-semibold ${styles.subTextColor}`}>
                {subValue}
              </span>
            )}
          </div>
          {subLabel && (
            <p className="mt-1 text-xs text-slate-400">
              {subLabel}
            </p>
          )}
        </div>

        <div className={`p-2.5 rounded-xl border ${styles.iconBg} ${styles.iconColor} transition-transform duration-200 group-hover:scale-105 shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
