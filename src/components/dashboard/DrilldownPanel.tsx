import React, { useState, useEffect, useCallback } from "react";
import { 
  Users, 
  UserCheck, 
  Clock, 
  UserX, 
  ArrowRightLeft, 
  ShieldAlert, 
  Search, 
  Filter, 
  RefreshCw, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Edit2, 
  AlertTriangle,
  ArrowUpDown,
  UserPlus
} from "lucide-react";
import { getDashboardDrilldown, DrilldownItem, DrilldownResponse } from "../../lib/api";

export type DrilldownCategory = "total" | "present" | "late" | "absent" | "transfers" | "denied";

interface DrilldownPanelProps {
  category: DrilldownCategory;
  date: string;
  shift: string;
  onClose: () => void;
  onMarkCheckIn?: (workerId: string) => Promise<{ success: boolean; error?: string }>;
  onApproveTransfer?: (id: number) => Promise<void>;
  onRejectTransfer?: (id: number) => Promise<void>;
  onOpenOverride?: (record: any) => void;
}

export const DrilldownPanel: React.FC<DrilldownPanelProps> = ({
  category,
  date,
  shift,
  onClose,
  onMarkCheckIn,
  onApproveTransfer,
  onRejectTransfer,
  onOpenOverride,
}) => {
  const [data, setData] = useState<DrilldownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [sortBy, setSortBy] = useState("workerId");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  const getCategoryConfig = () => {
    switch (category) {
      case "present":
        return {
          title: "Present Today — Cleared Workers",
          description: "Workers who checked in at turnstiles and cleared all required PPE checks.",
          icon: UserCheck,
          accentColor: "emerald",
          headerBg: "from-emerald-500/10 via-emerald-500/5 to-transparent",
          badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        };
      case "late":
        return {
          title: "Late Today — Grace Period Exceeded",
          description: "Workers who arrived past their shift start time exceeding configured grace period.",
          icon: Clock,
          accentColor: "amber",
          headerBg: "from-amber-500/10 via-amber-500/5 to-transparent",
          badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        };
      case "absent":
        return {
          title: "Absent Today — No Check-In Logged",
          description: "Enrolled workers in this shift who have not yet scanned their badge at any entry turnstile.",
          icon: UserX,
          accentColor: "rose",
          headerBg: "from-rose-500/10 via-rose-500/5 to-transparent",
          badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        };
      case "transfers":
        return {
          title: "Zone Transfers — Hazard Re-routing",
          description: "Workers re-routed to compatible safety zones due to missing secondary PPE.",
          icon: ArrowRightLeft,
          accentColor: "cyan",
          headerBg: "from-cyan-500/10 via-cyan-500/5 to-transparent",
          badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        };
      case "denied":
        return {
          title: "Access Denied — Turnstile Refusal Log",
          description: "Turnstile rejection events triggered by missing required primary PPE.",
          icon: ShieldAlert,
          accentColor: "rose",
          headerBg: "from-rose-500/15 via-rose-500/5 to-transparent",
          badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        };
      case "total":
      default:
        return {
          title: "Total Registered Shift Workers",
          description: "All active workers registered for this shift in the plant personnel database.",
          icon: Users,
          accentColor: "cyan",
          headerBg: "from-cyan-500/10 via-cyan-500/5 to-transparent",
          badgeBg: "bg-slate-700/60 text-slate-200 border-slate-600",
        };
    }
  };

  const config = getCategoryConfig();
  const Icon = config.icon;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboardDrilldown(
        category,
        date,
        shift,
        search,
        department,
        sortBy,
        sortOrder,
        page,
        pageSize
      );
      setData(res);
    } catch (err: any) {
      console.error("Drilldown fetch error:", err);
      setError(err?.message || "Failed to load drilldown records");
    } finally {
      setLoading(false);
    }
  }, [category, date, shift, search, department, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Quick Check-In for Absent Worker
  const handleCheckInWorker = async (workerId: string) => {
    if (!onMarkCheckIn) return;
    try {
      setActionLoadingId(workerId);
      const res = await onMarkCheckIn(workerId);
      if (res.success) {
        await fetchData();
      } else {
        alert(res.error || "Failed to check in worker");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Transfer Approval
  const handleApprove = async (id: number) => {
    if (!onApproveTransfer) return;
    try {
      setActionLoadingId(id);
      await onApproveTransfer(id);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to approve transfer");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Transfer Rejection
  const handleReject = async (id: number) => {
    if (!onRejectTransfer) return;
    try {
      setActionLoadingId(id);
      await onRejectTransfer(id);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to reject transfer");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="w-full glass-panel rounded-2xl border border-cyan-500/25 overflow-hidden transition-all duration-300 shadow-2xl relative">
      {/* Top Gradient Banner */}
      <div className={`p-5 bg-gradient-to-r ${config.headerBg} border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-white shrink-0 shadow-lg">
            <Icon className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-heading font-bold text-white tracking-wide">
                {config.title}
              </h2>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${config.badgeBg}`}>
                {data?.totalCount ?? 0} Records
              </span>
              <span className="text-xs font-mono text-slate-400">
                Shift: <span className="text-cyan-300 font-semibold">{shift}</span> &bull; {date}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {config.description}
            </p>
          </div>
        </div>

        {/* Right Action Controls: Refresh & Close */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            title="Refresh records"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-mono flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={onClose}
            title="Close inspection panel"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 transition-all text-xs font-mono flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close Panel</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-[#080d16]/90 border-b border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by ID, name, department, zone..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#0b111c] border border-slate-800 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-colors"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls: Department & Sorting */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="bg-[#0b111c] border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Departments</option>
              <option value="assembly">Assembly</option>
              <option value="welding">Welding</option>
              <option value="painting">Painting</option>
              <option value="packaging">Packaging</option>
              <option value="quality control">Quality Control</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#0b111c] border border-slate-800 text-xs text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="workerId">Sort: ID</option>
              <option value="name">Sort: Name</option>
              <option value="department">Sort: Dept</option>
              <option value="time">Sort: Time</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
              className="px-2 py-1.5 rounded-lg bg-[#0b111c] border border-slate-800 text-xs font-mono text-cyan-300 hover:bg-slate-800 transition-colors"
              title="Toggle sort direction"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#070c14] text-[11px] font-mono uppercase text-slate-400 tracking-wider">
              <th className="py-3 px-4">Worker</th>
              <th className="py-3 px-4">Worker ID</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Shift & Zone</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Notes & Reason</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {loading ? (
              // Skeleton Loader Rows
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800" />
                      <div className="h-3.5 w-24 bg-slate-800 rounded" />
                    </div>
                  </td>
                  <td className="py-4 px-4"><div className="h-3.5 w-16 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-3.5 w-20 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-3.5 w-24 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-3.5 w-14 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-5 w-16 bg-slate-800 rounded-full" /></td>
                  <td className="py-4 px-4"><div className="h-3.5 w-32 bg-slate-800 rounded" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-6 w-16 bg-slate-800 rounded inline-block" /></td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-rose-400 font-mono text-xs">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-400" />
                  <p>{error}</p>
                  <button
                    onClick={() => fetchData()}
                    className="mt-3 px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-mono text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-slate-600 mb-1" />
                  <p className="text-slate-300 font-semibold">No records match the selected filters.</p>
                  {search && (
                    <button
                      onClick={() => { setSearch(""); setDepartment("all"); }}
                      className="text-cyan-400 hover:underline text-[11px]"
                    >
                      Clear search filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr 
                  key={`${item.workerId}-${item.id || item.timestamp}`}
                  className="hover:bg-cyan-500/[0.03] transition-colors group"
                >
                  {/* Worker Name & Avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {item.name ? item.name.split(" ").map(n => n[0]).join("") : "W"}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors block">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {item.position || "Operator"}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Worker ID */}
                  <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                    {item.workerId}
                  </td>

                  {/* Department */}
                  <td className="py-3 px-4 text-slate-300">
                    {item.department}
                  </td>

                  {/* Shift & Zone */}
                  <td className="py-3 px-4 text-xs font-mono">
                    <span className="text-slate-300 font-medium">{item.zone}</span>
                    <span className="text-slate-500 block text-[10px]">{item.shift} Shift</span>
                  </td>

                  {/* Timestamp */}
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {item.timestamp !== "—" && item.timestamp !== "No Check-in" ? (
                      <span className="text-emerald-400 font-semibold">{item.timestamp}</span>
                    ) : (
                      <span className="text-slate-500">{item.timestamp}</span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4">
                    {item.status.toLowerCase() === "present" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        PRESENT
                      </span>
                    ) : item.status.toLowerCase() === "late" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        LATE
                      </span>
                    ) : item.status.toLowerCase() === "absent" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        ABSENT
                      </span>
                    ) : item.status.toUpperCase() === "PENDING" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        PENDING APPROVAL
                      </span>
                    ) : item.status.toUpperCase() === "APPROVED" ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        TRANSFERRED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        ACCESS DENIED
                      </span>
                    )}
                  </td>

                  {/* Reason / Notes / Missing items */}
                  <td className="py-3 px-4 max-w-xs">
                    <p className="text-slate-300 text-xs truncate" title={item.reason}>
                      {item.reason || "—"}
                    </p>
                    {item.missingItems && item.missingItems.length > 0 && (
                      <span className="text-[10px] font-mono text-rose-400 block">
                        Missing: {item.missingItems.join(", ")}
                      </span>
                    )}
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Absent worker quick check-in */}
                      {item.canCheckIn && (
                        <button
                          onClick={() => handleCheckInWorker(item.workerId)}
                          disabled={actionLoadingId === item.workerId}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 transition-all flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Check In</span>
                        </button>
                      )}

                      {/* Pending transfer approve / reject */}
                      {item.isTransfer && item.status.toUpperCase() === "PENDING" && item.id && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id!)}
                            disabled={actionLoadingId === item.id}
                            className="px-2 py-1 rounded-lg text-[10px] font-mono text-emerald-400 hover:bg-emerald-950/30 border border-emerald-500/30 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(item.id!)}
                            disabled={actionLoadingId === item.id}
                            className="px-2 py-1 rounded-lg text-[10px] font-mono text-rose-400 hover:bg-rose-950/30 border border-rose-500/30 transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {/* Manual Override for attendance records */}
                      {item.attendanceRecord && onOpenOverride && (
                        <button
                          onClick={() => onOpenOverride({
                            id: item.attendanceRecord,
                            workerId: item.workerId,
                            workerName: item.name,
                            date: date,
                            status: item.status,
                            assignedZoneName: item.zone,
                            shift: item.shift,
                          })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-colors"
                          title="Apply supervisor manual override"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {data && data.totalPages > 1 && (
        <div className="p-4 bg-[#070c14] border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Showing <span className="text-white font-semibold">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="text-white font-semibold">{Math.min(page * pageSize, data.totalCount)}</span> of{" "}
            <span className="text-cyan-400 font-semibold">{data.totalCount}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-800 bg-[#0b111c] disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-800 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
              {page} / {data.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-800 bg-[#0b111c] disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-800 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
