import React, { useState } from "react";
import { AttendanceRecord } from "../../types";
import { StatusBadge } from "../attendance/StatusBadge";
import { PPEChipGroup } from "../ppe/PPEChipGroup";
import { WorkerDetailModal } from "../modals/WorkerDetailModal";
import { Edit2, ExternalLink } from "lucide-react";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onOpenOverride?: (record: AttendanceRecord) => void;
  showOverrideAction?: boolean;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  onOpenOverride,
  showOverrideAction = true,
}) => {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-cyan-500/15 glass-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#0b111c]/80 text-[11px] font-mono uppercase text-slate-400 tracking-wider">
              <th className="py-3 px-4">Worker</th>
              <th className="py-3 px-4">Worker ID</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Shift</th>
              <th className="py-3 px-4">Check In</th>
              <th className="py-3 px-4">Check Out</th>
              <th className="py-3 px-4">Working Hours</th>
              <th className="py-3 px-4">Zone</th>
              <th className="py-3 px-4">PPE (5-Items)</th>
              <th className="py-3 px-4">Status</th>
              {showOverrideAction && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={showOverrideAction ? 11 : 10}
                  className="py-8 text-center text-slate-500 font-mono text-sm"
                >
                  No attendance records found matching filters.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr
                  key={`${record.workerId}-${record.date}`}
                  onClick={() => setSelectedRecord(record)}
                  className="hover:bg-cyan-500/[0.03] transition-colors cursor-pointer group"
                >
                  {/* Worker Name with Avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {record.workerName
                          ? record.workerName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                          : "W"}
                      </div>
                      <span className="font-medium text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {record.workerName || "Worker"}
                      </span>
                    </div>
                  </td>

                  {/* Worker ID */}
                  <td className="py-3 px-4 font-mono font-semibold text-cyan-400">
                    {record.workerId}
                  </td>

                  {/* Department */}
                  <td className="py-3 px-4 text-slate-300">
                    {record.department || "Production"}
                  </td>

                  {/* Shift */}
                  <td className="py-3 px-4 text-slate-400 font-mono">
                    {record.shift || "Morning"}
                  </td>

                  {/* Check In */}
                  <td className="py-3 px-4 font-mono font-medium text-slate-200">
                    {record.checkIn || <span className="text-slate-600">—</span>}
                  </td>

                  {/* Check Out */}
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {record.checkOut || <span className="text-slate-600">—</span>}
                  </td>

                  {/* Working Hours */}
                  <td className="py-3 px-4 font-mono">
                    {record.workingHours ? (
                      <span className="text-emerald-400 font-medium">
                        {record.workingHours}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Zone (shows Transfer if moved) */}
                  <td className="py-3 px-4">
                    {record.assignedZoneName && record.defaultZoneName && record.assignedZoneName !== record.defaultZoneName ? (
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-[11px] text-slate-300 font-medium">
                          <span className="text-slate-500 line-through mr-1">{record.defaultZoneName}</span>
                          <span className="text-cyan-300">&rarr; {record.assignedZoneName}</span>
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          TRANSFERRED
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-mono text-[11px]">
                        {record.assignedZoneName || record.defaultZoneName || "General Bay"}
                      </span>
                    )}
                  </td>

                  {/* PPE Chips */}
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <PPEChipGroup ppe={record.ppe} />
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4">
                    <StatusBadge
                      status={record.status}
                      manual={record.manualOverride}
                      size="sm"
                    />
                  </td>

                  {/* Actions */}
                  {showOverrideAction && (
                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onOpenOverride && onOpenOverride(record)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-all"
                        title="Manual Supervisor Override"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Override</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <WorkerDetailModal
        record={selectedRecord}
        isOpen={selectedRecord !== null}
        onClose={() => setSelectedRecord(null)}
        onOpenOverride={(rec) => {
          setSelectedRecord(null);
          if (onOpenOverride) onOpenOverride(rec);
        }}
      />
    </div>
  );
};
