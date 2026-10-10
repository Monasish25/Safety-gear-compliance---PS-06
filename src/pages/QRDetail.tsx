import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Building2, 
  Layers, 
  ArrowRightLeft,
  Calendar,
  Lock,
  LogIn
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getPublicQrData, markCheckIn, markCheckOut } from "../lib/api";
import { StatusBadge } from "../components/attendance/StatusBadge";
import { PPEChipGroup } from "../components/ppe/PPEChipGroup";

export const QRDetail: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, hasRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getPublicQrData(token)
      .then((res) => setData(res))
      .catch((err) => setData({ valid: false, message: err?.message || "Failed to verify badge" }))
      .finally(() => setLoading(false));
  }, [token]);

  const handleManualCheckIn = async (workerId: string) => {
    try {
      setActionLoading(true);
      await markCheckIn(workerId);
      setActionMessage("Manual check-in logged successfully!");
      // reload
      const res = await getPublicQrData(token!);
      setData(res);
    } catch (err: any) {
      alert(err?.message || "Check-in failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualCheckOut = async (workerId: string) => {
    try {
      setActionLoading(true);
      await markCheckOut(workerId);
      setActionMessage("Manual check-out logged successfully!");
      const res = await getPublicQrData(token!);
      setData(res);
    } catch (err: any) {
      alert(err?.message || "Check-out failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <span className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-sm text-slate-400">Verifying cryptographic QR badge signature...</p>
      </div>
    );
  }

  // Invalid or revoked token
  if (!data || !data.valid) {
    return (
      <div className="max-w-md mx-auto my-12 glass-panel p-8 text-center space-y-4 border border-rose-500/40">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-heading font-bold text-white">This QR code is not valid</h2>
        <p className="text-xs text-slate-400 font-mono">
          {data?.message || "The security token signature does not match or has been permanently revoked by plant administration."}
        </p>
        <div className="pt-4 border-t border-slate-800">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white"
          >
            <LogIn className="w-4 h-4 text-cyan-400" />
            <span>Staff Portal Login</span>
          </Link>
        </div>
      </div>
    );
  }

  const worker = data.worker;
  const todayAtt = data.todayAttendance;
  const isSupervisorOrHead = isAuthenticated && hasRole(["HEAD", "SUPERVISOR"]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 border border-cyan-500/30 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-base flex items-center justify-center">
              {worker?.name ? worker.name.substring(0, 2).toUpperCase() : "W"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-heading font-bold text-white">
                  {worker?.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  VALID BADGE
                </span>
              </div>
              <p className="text-xs font-mono text-cyan-400 mt-0.5">
                ID: {worker?.workerId} &bull; {worker?.position || "Operator"}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">
              Assigned Shift
            </span>
            <span className="text-xs font-mono text-slate-200 font-semibold">
              {worker?.shift} Shift
            </span>
          </div>
        </div>

        {/* Public Attributes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#0b111c] border border-slate-800">
            <span className="text-[10px] text-slate-500 block">DEPARTMENT</span>
            <span className="text-slate-200 font-semibold">{worker?.department}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0b111c] border border-slate-800">
            <span className="text-[10px] text-slate-500 block">DEFAULT ZONE</span>
            <span className="text-cyan-300 font-semibold">{worker?.defaultZoneName || "General Bay"}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0b111c] border border-slate-800">
            <span className="text-[10px] text-slate-500 block">TODAY STATUS</span>
            <div className="mt-1">
              {todayAtt ? (
                <StatusBadge status={todayAtt.status.toLowerCase() as any} size="sm" />
              ) : (
                <span className="text-slate-500">Not Scanned</span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0b111c] border border-slate-800">
            <span className="text-[10px] text-slate-500 block">ASSIGNED ZONE</span>
            <span className="text-slate-200">
              {todayAtt?.assignedZoneName || worker?.defaultZoneName || "General Bay"}
            </span>
          </div>
        </div>

        {/* Transfer notice if transferred */}
        {todayAtt && todayAtt.assignedZoneName && todayAtt.defaultZoneName && todayAtt.assignedZoneName !== todayAtt.defaultZoneName && (
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              <span>Transferred Today: {todayAtt.defaultZoneName} &rarr; {todayAtt.assignedZoneName}</span>
            </div>
            {todayAtt.transferReason && (
              <span className="text-slate-400 italic text-[11px]">"{todayAtt.transferReason}"</span>
            )}
          </div>
        )}

        {/* Required PPE for Default Zone */}
        {data.requiredPpe && (
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider font-semibold block">
              Required PPE for {worker?.defaultZoneName || "Zone"}
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.requiredPpe).map(([k, required]) => (
                <span
                  key={k}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono capitalize border ${
                    required
                      ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                      : "bg-slate-900 text-slate-500 border-slate-800 line-through"
                  }`}
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}

        {actionMessage && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
            {actionMessage}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SUPERVISOR & HEAD ELEVATED CONTROLS SECTION              */}
      {/* ======================================================== */}
      {isSupervisorOrHead ? (
        <div className="glass-panel p-6 space-y-6 border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="font-heading font-bold text-sm text-white">
                Supervisor Authorization Console
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              OFFICER CLEARANCE
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleManualCheckIn(worker?.workerId)}
              disabled={actionLoading}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-mono transition-colors disabled:opacity-50"
            >
              Manual Check-In
            </button>
            <button
              onClick={() => handleManualCheckOut(worker?.workerId)}
              disabled={actionLoading}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-mono transition-colors disabled:opacity-50"
            >
              Manual Check-Out
            </button>
          </div>

          {/* 30-Day Attendance History */}
          {data.history && data.history.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                Recent Attendance History (30 Days)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0b111c] border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">In</th>
                      <th className="py-2.5 px-3">Out</th>
                      <th className="py-2.5 px-3">Hours</th>
                      <th className="py-2.5 px-3">Zone</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.history.map((rec: any, idx: number) => (
                      <tr key={idx} className="hover:bg-cyan-500/[0.03]">
                        <td className="py-2 px-3 text-slate-200">{rec.date}</td>
                        <td className="py-2 px-3 text-slate-300">{rec.checkIn || "—"}</td>
                        <td className="py-2 px-3 text-slate-300">{rec.checkOut || "—"}</td>
                        <td className="py-2 px-3 text-emerald-400">{rec.workingHours || "—"}</td>
                        <td className="py-2 px-3 text-slate-300">{rec.assignedZoneName || rec.defaultZoneName}</td>
                        <td className="py-2 px-3">
                          <StatusBadge status={rec.status.toLowerCase() as any} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : !isAuthenticated ? (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">
            Plant supervisor? Log in to view 30-day compliance history and manual overrides.
          </span>
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Supervisor Login</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
};
