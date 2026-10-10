import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  HardHat,
  SlidersHorizontal,
  AlertTriangle
} from "lucide-react";
import { AttendanceTable } from "../components/tables/AttendanceTable";
import { ManualOverrideModal } from "../components/modals/ManualOverrideModal";
import { useAttendance } from "../hooks/useAttendance";
import { AttendanceRecord, ManualOverridePayload, PPEItem, ShiftName } from "../types";
import { exportReportToCSV } from "../lib/api";

export const Attendance: React.FC = () => {
  const getCurrentShift = (): ShiftName => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return "Morning";
    if (hour >= 14 && hour < 22) return "Afternoon";
    return "Night";
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activeShift, setActiveShift] = useState<string>("ALL");

  const { records, loading, error, refetch, applyOverride } = useAttendance(
    selectedDate, 
    activeShift === "ALL" ? undefined : activeShift
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ppeFilter, setPpeFilter] = useState("ALL");
  const [overrideRecord, setOverrideRecord] = useState<AttendanceRecord | null>(null);

  // Departments list
  const departments = ["ALL", "Production", "Assembly", "Maintenance", "Warehouse", "Quality", "Logistics"];
  const shiftList = ["ALL", "Morning", "Afternoon", "Night"];
  const statuses = [
    { label: "All Statuses", value: "ALL" },
    { label: "Present / Allowed", value: "present" },
    { label: "Late", value: "late" },
    { label: "Absent", value: "absent" },
    { label: "Access Denied", value: "access_denied" },
    { label: "Not Scanned Yet", value: "not_scanned" },
  ];
  const ppeOptions = [
    { label: "All PPE States", value: "ALL" },
    { label: "Any Missing", value: "ANY_MISSING" },
    { label: "Helmet Missing", value: "helmet" },
    { label: "Vest Missing", value: "vest" },
    { label: "Shoes Missing", value: "shoes" },
    { label: "Gloves Missing", value: "gloves" },
    { label: "Goggles Missing", value: "goggles" },
  ];

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search
      const matchesSearch =
        !searchQuery ||
        r.workerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.workerName && r.workerName.toLowerCase().includes(searchQuery.toLowerCase()));

      // Department
      const matchesDept = departmentFilter === "ALL" || r.department === departmentFilter;

      // Status
      const matchesStatus = statusFilter === "ALL" || r.status.toLowerCase() === statusFilter.toLowerCase();

      // PPE filter
      let matchesPPE = true;
      if (ppeFilter === "ANY_MISSING") {
        matchesPPE = Object.values(r.ppe || {}).some((s) => s === "MISSING");
      } else if (ppeFilter !== "ALL") {
        const itemKey = ppeFilter as PPEItem;
        matchesPPE = r.ppe?.[itemKey] === "MISSING";
      }

      return matchesSearch && matchesDept && matchesStatus && matchesPPE;
    });
  }, [records, searchQuery, departmentFilter, statusFilter, ppeFilter]);

  const handleExport = () => {
    exportReportToCSV(filteredRecords, selectedDate);
  };

  const handleOverrideSubmit = async (payload: ManualOverridePayload) => {
    return await applyOverride(payload);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            ATTENDANCE
          </span>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight mt-1">
            Daily Attendance Records
          </h1>
          <p className="text-xs text-slate-400">
            Real-time verified gate entries, PPE compliance results, zone allocations, and working hours
          </p>
        </div>

        {/* Date Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b111c] border border-slate-700">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-mono text-white focus:outline-none"
            />
          </div>

          {/* Shift Selector Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-[#0b111c] border border-slate-800">
            {shiftList.map((s) => (
              <button
                key={s}
                onClick={() => setActiveShift(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                  activeShift === s
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-cyan-500/40 text-xs font-mono font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXPORT CSV</span>
          </button>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Worker ID or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800 focus:border-cyan-500/60 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800 focus:border-cyan-500/60 text-xs text-slate-200 focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  Dept: {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800 focus:border-cyan-500/60 text-xs text-slate-200 focus:outline-none font-mono"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  Status: {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* PPE Filter */}
          <div>
            <select
              value={ppeFilter}
              onChange={(e) => setPpeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800 focus:border-cyan-500/60 text-xs text-slate-200 focus:outline-none font-mono"
            >
              {ppeOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  PPE: {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Attendance Table */}
      {error ? (
        <div className="p-8 text-center text-rose-400 font-mono text-xs glass-panel space-y-3 border border-rose-500/30">
          <AlertTriangle className="w-6 h-6 mx-auto text-rose-400" />
          <p>{error}</p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono hover:bg-rose-500/30 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : loading ? (
        <div className="p-16 text-center text-slate-500 font-mono text-sm glass-panel">
          <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block mr-2" />
          Loading attendance records...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-16 text-center text-slate-400 font-mono text-sm glass-panel space-y-2 border border-slate-800">
          <p className="font-semibold text-slate-300">No attendance records found.</p>
          <p className="text-xs text-slate-500">
            {records.length === 0 
              ? "No turnstile scans or check-ins have been recorded for this date and shift." 
              : "Try adjusting your search or filter options above."}
          </p>
        </div>
      ) : (
        <AttendanceTable
          records={filteredRecords}
          onOpenOverride={(rec) => setOverrideRecord(rec)}
          showOverrideAction={true}
        />
      )}

      {/* Manual Override Modal */}
      <ManualOverrideModal
        record={overrideRecord}
        isOpen={overrideRecord !== null}
        onClose={() => setOverrideRecord(null)}
        onSubmit={handleOverrideSubmit}
      />
    </div>
  );
};
