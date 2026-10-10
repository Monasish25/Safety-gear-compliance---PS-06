import React from "react";
import { AttendanceStatus, ScanResult } from "../../types";

interface StatusBadgeProps {
  status: AttendanceStatus | ScanResult;
  manual?: boolean;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, manual = false, size = "md" }) => {
  const normalized = status.toLowerCase();

  let styles = "bg-slate-800 text-slate-300 border-slate-700";
  let label = status.replace(/_/g, " ").toUpperCase();

  switch (normalized) {
    case "present":
    case "allowed":
      styles = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      label = normalized === "allowed" ? "ALLOWED" : "PRESENT";
      break;
    case "transferred":
      styles = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      label = "TRANSFERRED";
      break;
    case "late":
      styles = "bg-amber-500/10 text-amber-400 border-amber-500/30";
      label = "LATE";
      break;
    case "absent":
      styles = "bg-rose-500/10 text-rose-400 border-rose-500/30";
      label = "ABSENT";
      break;
    case "access_denied":
      styles = "bg-rose-950/20 text-rose-400 border-rose-500/60 ring-1 ring-rose-500/20";
      label = "ACCESS DENIED";
      break;
    case "needs_manual_check":
      styles = "bg-amber-950/20 text-amber-300 border-amber-500/50";
      label = "NEEDS MANUAL CHECK";
      break;
    case "not_scanned":
      styles = "bg-slate-800/40 text-slate-400 border-slate-700/60";
      label = "NOT SCANNED YET";
      break;
    case "checked_in":
      styles = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      label = "CHECKED IN";
      break;
    case "checked_out":
      styles = "bg-sky-500/10 text-sky-400 border-sky-500/30";
      label = "CHECKED OUT";
      break;
    case "id_not_visible":
      styles = "bg-amber-950/20 text-amber-400 border-amber-500/50";
      label = "ID NOT VISIBLE";
      break;
  }

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center font-mono font-medium rounded-md border tracking-wider uppercase transition-colors ${sizeClasses} ${styles}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            normalized === "present" || normalized === "checked_in"
              ? "bg-emerald-400"
              : normalized === "late"
              ? "bg-amber-400"
              : normalized === "access_denied" || normalized === "absent"
              ? "bg-rose-400"
              : "bg-slate-400"
          }`}
        />
        {label}
      </span>
      {manual && (
        <span
          title="Manual supervisor override"
          className="px-1.5 py-0.5 text-[10px] font-mono tracking-wider font-semibold rounded bg-cyan-950/50 text-cyan-400 border border-cyan-500/30"
        >
          MANUAL
        </span>
      )}
    </div>
  );
};
