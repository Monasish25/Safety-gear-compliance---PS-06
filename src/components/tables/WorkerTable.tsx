import React from "react";
import { Worker } from "../../types";
import { QrCode, FileText, UserX, UserCheck, Edit3 } from "lucide-react";

interface WorkerTableProps {
  workers: Worker[];
  onToggleDeactivate: (workerId: string) => void;
  onEditWorker?: (worker: Worker) => void;
  onViewBadge?: (worker: Worker) => void;
}

export const WorkerTable: React.FC<WorkerTableProps> = ({
  workers,
  onToggleDeactivate,
  onEditWorker,
  onViewBadge,
}) => {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-cyan-500/15 glass-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#0b111c]/80 text-[11px] font-mono uppercase text-slate-400 tracking-wider">
              <th className="py-3 px-4">Worker</th>
              <th className="py-3 px-4">Worker ID</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Default Zone</th>
              <th className="py-3 px-4">Shift</th>
              <th className="py-3 px-4">Position</th>
              <th className="py-3 px-4">Badge</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Attendance %</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {workers.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500 font-mono text-sm">
                  No workers found matching directory filters.
                </td>
              </tr>
            ) : (
              workers.map((worker) => (
                <tr
                  key={worker.workerId}
                  className="hover:bg-cyan-500/[0.03] transition-colors"
                >
                  {/* Worker Name with Avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {worker.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <div className="font-medium text-slate-100">{worker.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Joined {worker.joiningDate}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Worker ID */}
                  <td className="py-3 px-4 font-mono font-semibold text-cyan-400">
                    {worker.workerId}
                  </td>

                  {/* Department */}
                  <td className="py-3 px-4 text-slate-300 font-medium">
                    {worker.department}
                  </td>

                  {/* Default Zone */}
                  <td className="py-3 px-4 text-cyan-300 font-mono text-[11px]">
                    {worker.defaultZoneName || "General Bay"}
                  </td>

                  {/* Shift */}
                  <td className="py-3 px-4 text-slate-400 font-mono">
                    {worker.shift}
                  </td>

                  {/* Position */}
                  <td className="py-3 px-4 text-slate-300">
                    {worker.position}
                  </td>

                  {/* Badge Type */}
                  <td className="py-3 px-4 font-mono">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-slate-800/80 border border-slate-700 text-slate-300">
                      {worker.badgeType === "QR" ? (
                        <QrCode className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <FileText className="w-3 h-3 text-amber-400" />
                      )}
                      {worker.badgeType}
                    </span>
                  </td>

                  {/* Status (Active / Inactive) */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wider ${
                        worker.active
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          worker.active ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                      {worker.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>

                  {/* Attendance % */}
                  <td className="py-3 px-4 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        {worker.attendanceRate ?? 95}%
                      </span>
                      <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${worker.attendanceRate ?? 95}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {onViewBadge && (
                        <button
                          onClick={() => onViewBadge(worker)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-colors"
                          title="View & Print ID Badge"
                        >
                          <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                        </button>
                      )}
                      {onEditWorker && (
                        <button
                          onClick={() => onEditWorker(worker)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          title="Edit Worker Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onToggleDeactivate(worker.workerId)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          worker.active
                            ? "text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                            : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30"
                        }`}
                        title={worker.active ? "Deactivate Worker" : "Activate Worker"}
                      >
                        {worker.active ? (
                          <UserX className="w-3.5 h-3.5" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
