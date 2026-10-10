import React, { useState } from "react";
import { X, Check, AlertCircle } from "lucide-react";
import { AttendanceRecord, AttendanceStatus, ManualOverridePayload } from "../../types";

interface ManualOverrideModalProps {
  record: AttendanceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: ManualOverridePayload) => Promise<{ success: boolean; error?: string }>;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  record,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [checkIn, setCheckIn] = useState(record?.checkIn || "06:30");
  const [checkOut, setCheckOut] = useState(record?.checkOut || "");
  const [status, setStatus] = useState<AttendanceStatus>(record?.status || "present");
  const [reason, setReason] = useState("Camera glare / badge damaged");
  const [note, setNote] = useState(record?.note || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (record) {
      setCheckIn(record.checkIn || "06:30");
      setCheckOut(record.checkOut || "");
      setStatus(record.status || "present");
      setNote(record.note || "");
      setError(null);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a supervisor justification reason");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await onSubmit({
      workerId: record.workerId,
      workDate: record.date,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      status,
      reason,
      note,
    });
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to save override");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-md p-6 border border-cyan-500/30 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              SUPERVISOR AUDIT OVERRIDE
            </span>
            <h3 className="text-base font-heading font-bold text-white">
              {record.workerName || record.workerId}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              ID: {record.workerId} &bull; {record.department}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
                Check In Time
              </label>
              <input
                type="time"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
                Check Out Time
              </label>
              <input
                type="time"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
              Assigned Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
            >
              <option value="present">PRESENT</option>
              <option value="late">LATE</option>
              <option value="absent">ABSENT</option>
              <option value="access_denied">ACCESS DENIED</option>
            </select>
          </div>

          <div>
            <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
              Override Justification (Required for Audit)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="Camera glare / badge damaged">Camera glare / badge damaged</option>
              <option value="Badge QR obscured / physical badge verified">Badge QR obscured / physical badge verified</option>
              <option value="Authorized late entry / urgent production errand">Authorized late entry / urgent production errand</option>
              <option value="Footwear verified manually by supervisor">Footwear verified manually by supervisor</option>
              <option value="Other administrative correction">Other administrative correction</option>
            </select>
          </div>

          <div>
            <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
              Supervisor Note
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Verified by Supervisor S. Mehta at Turnstile 1"
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold font-mono text-xs hover:bg-cyan-400 active:scale-95 transition-all shadow-glow-cyan-sm disabled:opacity-50"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              SAVE OVERRIDE
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
