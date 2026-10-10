import React, { useState, useMemo } from "react";
import { 
  Users, 
  UserCheck, 
  Building2, 
  Clock, 
  UserPlus, 
  Search,
  RefreshCw,
  Printer,
  AlertTriangle
} from "lucide-react";
import { WorkerTable } from "../components/tables/WorkerTable";
import { WorkerModal } from "../components/modals/WorkerModal";
import { WorkerBadgeModal } from "../components/modals/WorkerBadgeModal";
import { useWorkers } from "../hooks/useWorkers";
import { Worker } from "../types";
import { getPrintBadgesPdfUrl } from "../lib/api";

export const Workers: React.FC = () => {
  const { workers, loading, error, refetch, addWorker, toggleDeactivate } = useWorkers();

  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [shiftFilter, setShiftFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBadgeWorker, setSelectedBadgeWorker] = useState<Worker | null>(null);

  // Departments list
  const departments = ["ALL", "Production", "Assembly", "Maintenance", "Warehouse", "Quality", "Logistics"];
  const shifts = ["ALL", "Morning", "Afternoon", "Night"];

  // Metrics
  const totalWorkers = workers.length;
  const activeWorkers = workers.filter((w) => w.active).length;
  const uniqueDepts = new Set(workers.map((w) => w.department)).size;

  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const matchesSearch =
        !searchQuery ||
        w.workerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.position.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = departmentFilter === "ALL" || w.department === departmentFilter;
      const matchesShift = shiftFilter === "ALL" || w.shift === shiftFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && w.active) ||
        (statusFilter === "INACTIVE" && !w.active);

      return matchesSearch && matchesDept && matchesShift && matchesStatus;
    });
  }, [workers, searchQuery, departmentFilter, shiftFilter, statusFilter]);

  const existingWorkerIds = workers.map((w) => w.workerId);

  const handleAddWorkerSubmit = async (
    data: Omit<Worker, "active" | "attendanceRate">
  ) => {
    return await addWorker(data);
  };

  const handlePrintAllBadges = () => {
    window.open(getPrintBadgesPdfUrl(), "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            WORKFORCE DIRECTORY
          </span>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight mt-1">
            Registered Factory Personnel
          </h1>
          <p className="text-xs text-slate-400">
            Cryptographically signed QR badge generation, zone allocations, and shift schedules
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintAllBadges}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-cyan-500/40 text-xs font-mono font-medium transition-colors shadow-sm"
            title="Generate A4 8-Badge PDF Sheet"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            <span>PRINT ALL BADGES</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-semibold font-sans text-xs hover:brightness-110 active:scale-95 transition-all shadow-glow-cyan-sm"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>ADD WORKER</span>
          </button>

          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400">Total Workers</span>
            <p className="font-mono text-xl font-bold text-white">{totalWorkers}</p>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400">Active Workers</span>
            <p className="font-mono text-xl font-bold text-emerald-400">{activeWorkers}</p>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400">Departments</span>
            <p className="font-mono text-xl font-bold text-cyan-400">{uniqueDepts}</p>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400">Shifts</span>
            <p className="font-mono text-xl font-bold text-amber-400">3 Configured</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-panel p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, name, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800 focus:border-cyan-500/60 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
            />
          </div>

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

          <div>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800 focus:border-cyan-500/60 text-xs text-slate-200 focus:outline-none"
            >
              {shifts.map((s) => (
                <option key={s} value={s}>
                  Shift: {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-800 focus:border-cyan-500/60 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">Status: All Statuses</option>
              <option value="ACTIVE">Status: Active</option>
              <option value="INACTIVE">Status: Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
          <span>
            Displaying <span className="text-white font-semibold">{filteredWorkers.length}</span> personnel
          </span>
          {(searchQuery || departmentFilter !== "ALL" || shiftFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDepartmentFilter("ALL");
                setShiftFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="text-cyan-400 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Workers Table or Error / Loading / Empty states */}
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
          Loading workforce registry...
        </div>
      ) : workers.length === 0 ? (
        <div className="p-16 text-center text-slate-400 font-mono text-sm glass-panel space-y-3 border border-slate-800">
          <p className="font-semibold text-slate-200 text-base">No workers registered yet.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Enroll factory workers to automatically issue signed security badges and track PPE verified turnstile attendance.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono hover:bg-cyan-500/30 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add First Worker</span>
          </button>
        </div>
      ) : (
        <WorkerTable
          workers={filteredWorkers}
          onToggleDeactivate={toggleDeactivate}
          onViewBadge={(worker) => setSelectedBadgeWorker(worker)}
        />
      )}

      {/* Add Worker Modal */}
      <WorkerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddWorkerSubmit}
        existingWorkerIds={existingWorkerIds}
      />

      {/* Worker Badge & QR Modal */}
      <WorkerBadgeModal
        worker={selectedBadgeWorker}
        isOpen={selectedBadgeWorker !== null}
        onClose={() => setSelectedBadgeWorker(null)}
        onWorkerUpdated={() => refetch()}
      />
    </div>
  );
};
