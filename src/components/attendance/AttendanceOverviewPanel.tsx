import React from "react";
import { AttendanceSummary } from "../../types";
import { AttendancePieChart } from "../charts/AttendancePieChart";
import { PPEComplianceBarChart } from "../charts/PPEComplianceBarChart";
import { HourlyCheckInsChart } from "../charts/HourlyCheckInsChart";
import { ShieldAlert, Activity } from "lucide-react";

interface AttendanceOverviewPanelProps {
  summary: AttendanceSummary;
}

export const AttendanceOverviewPanel: React.FC<AttendanceOverviewPanelProps> = ({ summary }) => {
  return (
    <div className="glass-panel p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-800/80 mb-6">
        <div>
          <h2 className="text-lg font-heading font-bold text-white tracking-wide">
            Attendance Overview
          </h2>
          <p className="text-xs text-slate-400">
            Worker attendance breakdown and gate compliance telemetry for today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-semibold">
            {summary.presentPercentage}% RATE
          </span>
        </div>
      </div>

      {/* Grid with 3 chart sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chart 1: Donut breakdown (5 cols) */}
        <div className="lg:col-span-5 glass-panel-subtle p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
              Shift Status Ratio
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              {summary.present} Present
            </span>
          </div>
          <AttendancePieChart
            present={summary.present}
            late={summary.late}
            absent={summary.absent}
          />
        </div>

        {/* Chart 2: PPE Denials at gate entry (4 cols) */}
        <div className="lg:col-span-4 glass-panel-subtle p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                PPE Denials at Entry
              </span>
            </div>
            <span className="text-[11px] font-mono text-rose-400 font-bold">
              {summary.accessDenied} Total
            </span>
          </div>
          <PPEComplianceBarChart data={summary.ppeViolations} />
          <p className="mt-3 text-[10px] text-slate-400 font-mono">
            Most denied: Gloves & Goggles. Workers must complete PPE to clear gate turnstile.
          </p>
        </div>

        {/* Chart 3: Hourly check-in flow (3 cols) */}
        <div className="lg:col-span-3 glass-panel-subtle p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Hourly Gate Flow
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">06:00 - 10:00</span>
          </div>
          <HourlyCheckInsChart data={summary.hourlyCheckIns} />
          <div className="mt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Peak throughput:</span>
            <span className="text-white font-semibold">07:00 (88 workers)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
