import React, { useState, useEffect, useCallback } from "react";
import { 
  Users, 
  UserCheck, 
  Clock, 
  UserX, 
  ShieldAlert, 
  Calendar,
  Layers,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Building2
} from "lucide-react";
import { Link } from "react-router-dom";
import { MetricCard } from "../components/cards/MetricCard";
import { MarkAttendanceButton } from "../components/buttons/MarkAttendanceButton";
import { AttendanceOverviewPanel } from "../components/attendance/AttendanceOverviewPanel";
import { AttendanceTable } from "../components/tables/AttendanceTable";
import { ManualOverrideModal } from "../components/modals/ManualOverrideModal";
import { useAttendance } from "../hooks/useAttendance";
import { useWorkers } from "../hooks/useWorkers";
import { useAuth } from "../context/AuthContext";
import { DrilldownPanel, DrilldownCategory } from "../components/dashboard/DrilldownPanel";
import { 
  ShiftName, 
  AttendanceRecord, 
  ManualOverridePayload, 
  ZoneOccupancy, 
  ZoneAssignment 
} from "../types";
import { 
  getZoneOccupancy, 
  getPendingTransfers, 
  approveTransfer, 
  rejectTransfer 
} from "../lib/api";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { workers } = useWorkers();

  // Helper to get local YYYY-MM-DD
  const getLocalDateStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateStr());
  const [selectedCategory, setSelectedCategory] = useState<DrilldownCategory | null>(null);

  // Helper to determine the current shift based on real time
  const getCurrentShift = (): ShiftName => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return "Morning";
    if (hour >= 14 && hour < 22) return "Afternoon";
    return "Night";
  };

  const [activeShift, setActiveShift] = useState<ShiftName>(getCurrentShift());
  const { 
    records, 
    summary, 
    loading: attendanceLoading, 
    error: attendanceError, 
    refetch: refetchAttendance,
    checkIn, 
    checkOut, 
    applyOverride 
  } = useAttendance(selectedDate, activeShift);

  const [overrideRecord, setOverrideRecord] = useState<AttendanceRecord | null>(null);
  const [occupancy, setOccupancy] = useState<ZoneOccupancy[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<ZoneAssignment[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const shifts: ShiftName[] = ["Morning", "Afternoon", "Night"];

  // Fetch Zone Occupancy & Pending Approvals
  const fetchZoneData = useCallback(async () => {
    try {
      setZonesLoading(true);
      const [occData, transData] = await Promise.all([
        getZoneOccupancy(selectedDate),
        getPendingTransfers()
      ]);
      setOccupancy(occData);
      setPendingTransfers(transData);
    } catch (err) {
      console.error("Failed to load zone occupancy or transfers:", err);
    } finally {
      setZonesLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchZoneData();
  }, [fetchZoneData, activeShift, selectedDate]);

  const handleApproveTransfer = async (id: number) => {
    try {
      setActionLoadingId(id);
      await approveTransfer(id);
      await Promise.all([fetchZoneData(), refetchAttendance()]);
    } catch (err: any) {
      alert(err?.message || "Failed to approve transfer");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectTransfer = async (id: number) => {
    const reason = window.prompt("Reason for rejecting zone transfer (optional):");
    try {
      setActionLoadingId(id);
      await rejectTransfer(id, reason || undefined);
      await Promise.all([fetchZoneData(), refetchAttendance()]);
    } catch (err: any) {
      alert(err?.message || "Failed to reject transfer");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOverrideSubmit = async (payload: ManualOverridePayload) => {
    return await applyOverride(payload);
  };

  // Filter records for active shift
  const shiftRecords = records.filter((r) => !activeShift || r.shift === activeShift);

  // Today formatted for display
  const formattedToday = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/40">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-xs font-mono text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold tracking-wide">WELCOME, {user?.name || "OFFICER"}</span>
            <span className="text-cyan-500/40">&bull;</span>
            <span className="text-slate-400 font-normal">{user?.role || "HEAD"} CLEARANCE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-normal leading-tight pt-0.5">
            Plant Access Dashboard
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <Calendar className="w-3.5 h-3.5 text-cyan-400/70" />
            <span>{formattedToday}</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-emerald-400 font-medium">Shift: {activeShift}</span>
          </div>
        </div>

        {/* Right Controls: Date Picker, Shift Selector & Mark Attendance Button */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Interactive Date Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b111c] border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value);
                }
              }}
              className="bg-transparent border-none text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
              title="Select attendance date"
            />
          </div>

          {/* Shift Selector */}
          <div className="flex items-center p-1 rounded-xl bg-[#0b111c] border border-slate-800">
            {shifts.map((s) => (
              <button
                key={s}
                onClick={() => setActiveShift(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  activeShift === s
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Mark Attendance Button with existing popup animation */}
          <MarkAttendanceButton
            workers={workers}
            onCheckIn={checkIn}
            onCheckOut={checkOut}
          />
        </div>
      </div>

      {/* Metric Cards Grid: All 6 cards are clickable with active glow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Total Workers"
          value={summary?.totalWorkers ?? workers.length}
          subLabel="Enrolled in Registry"
          icon={Users}
          variant="default"
          onClick={() => setSelectedCategory(prev => prev === "total" ? null : "total")}
          isSelected={selectedCategory === "total"}
          isLoading={attendanceLoading}
        />

        <MetricCard
          label="Present Today"
          value={summary?.present ?? 0}
          subValue={`${summary?.presentPercentage ?? 0}%`}
          subLabel="Checked In & Cleared"
          icon={UserCheck}
          variant="emerald"
          onClick={() => setSelectedCategory(prev => prev === "present" ? null : "present")}
          isSelected={selectedCategory === "present"}
          isLoading={attendanceLoading}
        />

        <MetricCard
          label="Late Today"
          value={summary?.late ?? 0}
          subValue={`${summary?.latePercentage ?? 0}%`}
          subLabel="Exceeded 10m Grace"
          icon={Clock}
          variant="amber"
          onClick={() => setSelectedCategory(prev => prev === "late" ? null : "late")}
          isSelected={selectedCategory === "late"}
          isLoading={attendanceLoading}
        />

        <MetricCard
          label="Absent Today"
          value={summary?.absent ?? 0}
          subValue={`${summary?.absentPercentage ?? 0}%`}
          subLabel="No Entry Logged"
          icon={UserX}
          variant="rose"
          onClick={() => setSelectedCategory(prev => prev === "absent" ? null : "absent")}
          isSelected={selectedCategory === "absent"}
          isLoading={attendanceLoading}
        />

        <MetricCard
          label="Zone Transfers"
          value={summary?.zoneTransfersToday ?? 0}
          subValue={`${pendingTransfers.length} Pending`}
          subLabel="Moved to Safe Zone"
          icon={ArrowRightLeft}
          variant="cyan"
          onClick={() => setSelectedCategory(prev => prev === "transfers" ? null : "transfers")}
          isSelected={selectedCategory === "transfers"}
          isLoading={attendanceLoading}
        />

        <MetricCard
          label="Access Denied"
          value={summary?.accessDenied ?? 0}
          subValue="Incomplete PPE"
          subLabel="Turnstile Refused"
          icon={ShieldAlert}
          variant="rose"
          onClick={() => setSelectedCategory(prev => prev === "denied" ? null : "denied")}
          isSelected={selectedCategory === "denied"}
          isLoading={attendanceLoading}
        />
      </div>

      {/* Interactive Drilldown Panel: Appears immediately upon clicking any summary card */}
      {selectedCategory && (
        <DrilldownPanel
          category={selectedCategory}
          date={selectedDate}
          shift={activeShift}
          onClose={() => setSelectedCategory(null)}
          onMarkCheckIn={async (workerId) => {
            const res = await checkIn(workerId);
            if (res.success) {
              await Promise.all([refetchAttendance(), fetchZoneData()]);
            }
            return res;
          }}
          onApproveTransfer={handleApproveTransfer}
          onRejectTransfer={handleRejectTransfer}
          onOpenOverride={(rec) => setOverrideRecord(rec)}
        />
      )}

      {/* Attendance Overview Chart Panel */}
      {summary && <AttendanceOverviewPanel summary={summary} />}

      {/* Mid Section: Zone Occupancy & Pending Approvals Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (col-span-6): Zone Occupancy Panel */}
        <div className="lg:col-span-6 glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-heading font-bold text-white tracking-wide">
                Zone Occupancy
              </h3>
            </div>
            <button
              onClick={fetchZoneData}
              disabled={zonesLoading}
              className="text-xs font-mono text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${zonesLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {occupancy.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-mono text-xs">
              No zones registered yet. Configure zones in Settings.
            </div>
          ) : (
            <div className="space-y-3">
              {occupancy.map((zone) => {
                const percent = zone.capacity > 0 
                  ? Math.min(100, Math.round((zone.assignedCount / zone.capacity) * 100)) 
                  : 0;
                const isNearCap = percent >= 85;
                const isFull = percent >= 100;

                return (
                  <div key={zone.zoneId} className="p-3 rounded-xl bg-[#0b111c]/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{zone.zoneName}</span>
                      <span className="font-mono text-slate-400">
                        <span className={isFull ? "text-rose-400 font-bold" : isNearCap ? "text-amber-400" : "text-cyan-400"}>
                          {zone.assignedCount}
                        </span>
                        {" "}/ {zone.capacity} Workers
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isFull
                            ? "bg-rose-500"
                            : isNearCap
                            ? "bg-amber-400"
                            : "bg-cyan-400"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (col-span-6): Pending Approvals Panel */}
        <div className="lg:col-span-6 glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-heading font-bold text-white tracking-wide">
                Pending Zone Transfers ({pendingTransfers.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Supervisor Action Required
            </span>
          </div>

          {pendingTransfers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-mono text-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-400/50 mx-auto mb-2" />
              All zone transfers cleared. No pending requests.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {pendingTransfers.map((item) => (
                <div 
                  key={item.id} 
                  className="p-3 rounded-xl bg-[#0b111c]/60 border border-amber-500/20 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-100">{item.workerName || item.workerId}</span>
                      <span className="text-slate-400 font-mono text-[10px] ml-2">ID: {item.workerId}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      PENDING
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
                    <span className="text-slate-500 line-through">{item.fromZoneName}</span>
                    <span className="text-cyan-400">&rarr;</span>
                    <span className="text-cyan-300 font-semibold">{item.toZoneName}</span>
                  </div>

                  {item.missingItems && item.missingItems.length > 0 && (
                    <div className="text-[10px] font-mono text-rose-400">
                      Missing: {item.missingItems.join(", ")}
                    </div>
                  )}

                  {item.reason && (
                    <div className="text-[10px] text-slate-400 italic">
                      "{item.reason}"
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                    <button
                      onClick={() => handleRejectTransfer(item.id)}
                      disabled={actionLoadingId === item.id}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-rose-400 hover:bg-rose-950/30 border border-rose-500/30 transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveTransfer(item.id)}
                      disabled={actionLoadingId === item.id}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-emerald-400 hover:bg-emerald-950/30 border border-emerald-500/30 transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Today's Attendance Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-heading font-bold text-white tracking-wide">
              Today's Attendance Records
            </h3>
            <span className="text-xs font-mono text-slate-400">
              ({shiftRecords.length} records in {activeShift} shift)
            </span>
          </div>

          <Link
            to="/attendance"
            className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors group"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {attendanceError ? (
          <div className="p-8 text-center text-rose-400 font-mono text-xs glass-panel space-y-3 border border-rose-500/30">
            <AlertTriangle className="w-6 h-6 mx-auto text-rose-400" />
            <p>{attendanceError}</p>
            <button
              onClick={() => refetchAttendance()}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono hover:bg-rose-500/30 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        ) : attendanceLoading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm glass-panel">
            <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block mr-2" />
            Loading attendance records...
          </div>
        ) : shiftRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs glass-panel border border-slate-800 space-y-2">
            <p className="text-sm font-semibold text-slate-300">No scans or check-ins today for {activeShift} shift.</p>
            <p className="text-slate-500">Scan badges at turnstiles or use the Mark Attendance action above.</p>
          </div>
        ) : (
          <AttendanceTable
            records={shiftRecords}
            onOpenOverride={(rec) => setOverrideRecord(rec)}
          />
        )}
      </div>

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
