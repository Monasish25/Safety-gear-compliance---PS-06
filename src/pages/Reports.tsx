import React, { useState, useEffect, useMemo } from "react";
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Filter, 
  CheckCircle, 
  Clock, 
  UserX, 
  ShieldAlert, 
  TrendingUp, 
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Building2,
  Layers
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from "recharts";
import { getReport, exportReportToCSV } from "../lib/api";
import { AttendanceRecord, ShiftName } from "../types";

export const Reports: React.FC = () => {
  const today = new Date();
  const pastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [dateFrom, setDateFrom] = useState(pastWeek.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedShift, setSelectedShift] = useState("ALL");
  const [workerQuery, setWorkerQuery] = useState("");

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const departments = ["ALL", "Production", "Assembly", "Maintenance", "Warehouse", "Quality", "Logistics"];
  const shifts = ["ALL", "Morning", "Afternoon", "Night"];

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: Record<string, string> = {};
      if (selectedDept !== "ALL") filters.dept = selectedDept;
      if (selectedShift !== "ALL") filters.shift = selectedShift;

      const data = await getReport(dateFrom, dateTo, filters);
      setRecords(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load attendance report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateFrom, dateTo, selectedDept, selectedShift]);

  // Client search filter
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchWorker =
        !workerQuery ||
        r.workerId.toLowerCase().includes(workerQuery.toLowerCase()) ||
        (r.workerName && r.workerName.toLowerCase().includes(workerQuery.toLowerCase()));
      return matchWorker;
    });
  }, [records, workerQuery]);

  // Aggregate metrics from real records
  const total = filteredRecords.length;
  const presentCount = filteredRecords.filter((r) => r.status.toLowerCase() === "present" || r.status.toLowerCase() === "allowed").length;
  const lateCount = filteredRecords.filter((r) => r.status.toLowerCase() === "late").length;
  const absentCount = filteredRecords.filter((r) => r.status.toLowerCase() === "absent").length;
  const deniedCount = filteredRecords.filter((r) => r.status.toLowerCase() === "access_denied").length;
  const transferredCount = filteredRecords.filter((r) => r.decision === "TRANSFERRED" || (r.assignedZoneName && r.defaultZoneName && r.assignedZoneName !== r.defaultZoneName)).length;

  const attendanceRate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;

  // Real Department breakdown
  const departmentStats = useMemo(() => {
    const deptMap: Record<string, { total: number; present: number }> = {};
    filteredRecords.forEach((r) => {
      const d = r.department || "General";
      if (!deptMap[d]) deptMap[d] = { total: 0, present: 0 };
      deptMap[d].total += 1;
      if (r.status.toLowerCase() === "present" || r.status.toLowerCase() === "late") {
        deptMap[d].present += 1;
      }
    });

    return Object.entries(deptMap).map(([name, stat]) => ({
      name,
      workers: stat.total,
      rate: stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0,
    }));
  }, [filteredRecords]);

  // Real Shift breakdown
  const shiftStats = useMemo(() => {
    const shiftMap: Record<string, { present: number; late: number; absent: number }> = {
      Morning: { present: 0, late: 0, absent: 0 },
      Afternoon: { present: 0, late: 0, absent: 0 },
      Night: { present: 0, late: 0, absent: 0 },
    };

    filteredRecords.forEach((r) => {
      const s = r.shift || "Morning";
      if (!shiftMap[s]) shiftMap[s] = { present: 0, late: 0, absent: 0 };
      const st = r.status.toLowerCase();
      if (st === "present" || st === "allowed") shiftMap[s].present += 1;
      else if (st === "late") shiftMap[s].late += 1;
      else if (st === "absent") shiftMap[s].absent += 1;
    });

    return Object.entries(shiftMap).map(([shift, stat]) => ({
      shift,
      ...stat,
    }));
  }, [filteredRecords]);

  const handleExportCSV = () => {
    exportReportToCSV(filteredRecords, `${dateFrom}_to_${dateTo}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            ANALYTICS & COMPLIANCE
          </span>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight mt-1">
            Attendance & Zone Reports
          </h1>
          <p className="text-xs text-slate-400">
            Real telemetry across shifts, PPE compliance audit trails, and zone transfer records
          </p>
        </div>

        {/* Export & Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-semibold font-sans text-xs hover:brightness-110 active:scale-95 transition-all shadow-glow-cyan-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>EXPORT CSV (WITH ZONES)</span>
          </button>

          <button
            onClick={fetchReportData}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <div className="flex items-center gap-1 text-xs font-mono text-white">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
              <span className="text-slate-500">&rarr;</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800 text-xs text-slate-200 focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  Dept: {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800 text-xs text-slate-200 focus:outline-none"
            >
              {shifts.map((s) => (
                <option key={s} value={s}>
                  Shift: {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="text"
              placeholder="Search Worker ID or Name..."
              value={workerQuery}
              onChange={(e) => setWorkerQuery(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center text-rose-400 font-mono text-xs glass-panel space-y-3 border border-rose-500/30">
          <AlertTriangle className="w-6 h-6 mx-auto text-rose-400" />
          <p>{error}</p>
          <button
            onClick={fetchReportData}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono hover:bg-rose-500/30 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : loading ? (
        <div className="p-16 text-center text-slate-500 font-mono text-sm glass-panel">
          <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block mr-2" />
          Aggregating attendance telemetry...
        </div>
      ) : (
        <>
          {/* Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="glass-panel p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Compliance Rate</span>
              <p className="font-mono text-2xl font-bold text-white mt-1">{attendanceRate}%</p>
              <span className="text-[11px] text-emerald-400 font-mono mt-0.5 inline-block">Period Average</span>
            </div>

            <div className="glass-panel p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Present</span>
              <p className="font-mono text-2xl font-bold text-emerald-400 mt-1">{presentCount}</p>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 inline-block">Cleared At Gate</span>
            </div>

            <div className="glass-panel p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Late Arrivals</span>
              <p className="font-mono text-2xl font-bold text-amber-400 mt-1">{lateCount}</p>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 inline-block">&gt; 10m Grace</span>
            </div>

            <div className="glass-panel p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Absent</span>
              <p className="font-mono text-2xl font-bold text-rose-400 mt-1">{absentCount}</p>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 inline-block">No Entry Logged</span>
            </div>

            <div className="glass-panel p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Zone Transfers</span>
              <p className="font-mono text-2xl font-bold text-cyan-400 mt-1">{transferredCount}</p>
              <span className="text-[11px] text-cyan-300 font-mono mt-0.5 inline-block">Moved to Safe Zone</span>
            </div>

            <div className="glass-panel p-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Access Denied</span>
              <p className="font-mono text-2xl font-bold text-rose-400 mt-1">{deniedCount}</p>
              <span className="text-[11px] text-rose-400 font-mono mt-0.5 inline-block">Missing PPE</span>
            </div>
          </div>

          {/* Department & Shift Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown */}
            <div className="glass-panel p-5 space-y-3">
              <h3 className="font-heading font-bold text-sm text-white">
                Department Compliance Ratios
              </h3>
              {departmentStats.length === 0 ? (
                <div className="py-8 text-center text-slate-500 font-mono text-xs">
                  No attendance records in selected date range.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {departmentStats.map((d) => (
                    <div key={d.name} className="p-2.5 rounded-lg bg-[#0b111c] border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-200 font-medium">{d.name}</span>
                        <span className="text-cyan-400 font-bold">{d.rate}% Rate ({d.workers} Records)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${d.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shift Breakdown */}
            <div className="glass-panel p-5 space-y-3">
              <h3 className="font-heading font-bold text-sm text-white">
                Shift Volume & Compliance Breakdown
              </h3>
              {shiftStats.every((s) => s.present === 0 && s.late === 0 && s.absent === 0) ? (
                <div className="py-8 text-center text-slate-500 font-mono text-xs">
                  No shift check-ins recorded in selected range.
                </div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={shiftStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="shift" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                      <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0b111c",
                          borderColor: "rgba(0, 240, 255, 0.2)",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontFamily: "monospace",
                        }}
                      />
                      <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" name="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
