import React from "react";
import { X, Clock, ShieldCheck, User, Calendar, Edit3 } from "lucide-react";
import { AttendanceRecord } from "../../types";
import { StatusBadge } from "../attendance/StatusBadge";
import { PPEChip } from "../ppe/PPEChip";

interface WorkerDetailModalProps {
  record: AttendanceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenOverride?: (record: AttendanceRecord) => void;
}

export const WorkerDetailModal: React.FC<WorkerDetailModalProps> = ({
  record,
  isOpen,
  onClose,
  onOpenOverride,
}) => {
  if (!isOpen || !record) return null;

  const ppeItems = ["helmet", "vest", "shoes", "gloves", "goggles"] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 border border-cyan-500/30 shadow-2xl relative animate-popup-expand">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-lg flex items-center justify-center">
              {record.workerName
                ? record.workerName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                : "W"}
            </div>
            <div>
              <h3 className="text-lg font-heading font-bold text-white">
                {record.workerName || "Worker Record"}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-cyan-400 text-xs font-semibold">
                  {record.workerId}
                </span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-xs text-slate-300">{record.department}</span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-xs text-slate-400">{record.shift} Shift</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-5">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0b111c] border border-slate-800">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                TODAY'S ATTENDANCE STATUS
              </span>
              <div className="mt-1">
                <StatusBadge status={record.status} manual={record.manualOverride} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                DATE
              </span>
              <p className="font-mono text-xs text-slate-200 mt-1">
                {record.date}
              </p>
            </div>
          </div>

          {/* Time & Hours Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#0b111c] border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                <Clock className="w-3 h-3 text-cyan-400" />
                Check In
              </div>
              <p className="font-mono text-base font-bold text-white mt-1">
                {record.checkIn || "—"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0b111c] border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                <Clock className="w-3 h-3 text-sky-400" />
                Check Out
              </div>
              <p className="font-mono text-base font-bold text-white mt-1">
                {record.checkOut || "—"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0b111c] border border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono uppercase">
                <Calendar className="w-3 h-3 text-emerald-400" />
                Working Hours
              </div>
              <p className="font-mono text-base font-bold text-emerald-400 mt-1">
                {record.workingHours || "—"}
              </p>
            </div>
          </div>

          {/* 5-Point PPE Check Breakdown */}
          <div className="p-4 rounded-xl bg-[#0b111c] border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Gate Entry PPE Compliance (5 Items)
              </span>
              <span className="text-[10px] font-mono text-cyan-400">Required For Clearance</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ppeItems.map((item) => (
                <div key={item} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <PPEChip item={item} state={record.ppe?.[item] || "NOT_VISIBLE"} showLabel />
                </div>
              ))}
            </div>
          </div>

          {/* Supervisor Notes & Audit */}
          {record.note && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                SUPERVISOR AUDIT LOG
              </span>
              <p className="text-xs text-slate-300 mt-1 font-sans">
                {record.note}
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
          {onOpenOverride && (
            <button
              onClick={() => {
                onClose();
                onOpenOverride(record);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-mono font-medium transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Manual Override
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
