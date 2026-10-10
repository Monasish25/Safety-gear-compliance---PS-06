import React, { useState, useEffect } from "react";
import { X, UserPlus, AlertCircle, Check } from "lucide-react";
import { Worker, ShiftName, BadgeType, Zone } from "../../types";
import { getZones } from "../../lib/api";

interface WorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (worker: Omit<Worker, "active" | "attendanceRate">) => Promise<{ success: boolean; error?: string }>;
  existingWorkerIds: string[];
}

export const WorkerModal: React.FC<WorkerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingWorkerIds,
}) => {
  const [name, setName] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [department, setDepartment] = useState("Production");
  const [shift, setShift] = useState<ShiftName>("Morning");
  const [position, setPosition] = useState("Machine Operator");
  const [defaultZoneId, setDefaultZoneId] = useState<number | undefined>(undefined);
  const [badgeType, setBadgeType] = useState<BadgeType>("QR");
  const [joiningDate, setJoiningDate] = useState("2026-10-01");
  const [photoUrl, setPhotoUrl] = useState("");
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getZones()
        .then((z) => {
          setZones(z);
          if (z.length > 0 && defaultZoneId === undefined) {
            setDefaultZoneId(z[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = workerId.trim().toUpperCase();

    if (!name.trim()) {
      setError("Full Name is required");
      return;
    }

    if (!cleanId) {
      setError("Worker ID is required");
      return;
    }

    const idRegex = /^W-\d{4}$/;
    if (!idRegex.test(cleanId)) {
      setError("Worker ID must match format W-XXXX (e.g. W-1026)");
      return;
    }

    if (existingWorkerIds.includes(cleanId)) {
      setError(`Worker ID ${cleanId} already exists in workforce registry`);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await onSubmit({
      workerId: cleanId,
      name: name.trim(),
      department,
      shift,
      defaultZoneId,
      position: position.trim() || "Operator",
      badgeType,
      joiningDate,
      photoUrl: photoUrl.trim() || undefined,
    });

    setLoading(false);
    if (res.success) {
      onClose();
      // Reset form
      setName("");
      setWorkerId("");
    } else {
      setError(res.error || "Failed to add worker");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 border border-cyan-500/30 shadow-2xl relative animate-popup-expand">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-white">
                Add Factory Worker
              </h3>
              <p className="text-xs text-slate-400">
                Register new personnel into smart attendance gate registry
              </p>
            </div>
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
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amit Sengupta"
                className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
                Worker ID * (W-XXXX)
              </label>
              <input
                type="text"
                required
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                placeholder="e.g. W-1026"
                className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Production">Production</option>
                <option value="Assembly">Assembly</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Quality">Quality</option>
                <option value="Logistics">Logistics</option>
              </select>
            </div>

            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
                Assigned Shift
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as ShiftName)}
                className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Morning">Morning (09:00 - 17:00)</option>
                <option value="Afternoon">Afternoon (14:00 - 22:00)</option>
                <option value="Night">Night (22:00 - 06:00)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
                Default Work Zone *
              </label>
              <select
                value={defaultZoneId ?? ""}
                onChange={(e) => setDefaultZoneId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:border-cyan-500 focus:outline-none font-mono"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} (Cap: {z.capacityPerShift})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
                Position / Job Title
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Welding Specialist"
                className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
                Security Badge Type
              </label>
              <select
                value={badgeType}
                onChange={(e) => setBadgeType(e.target.value as BadgeType)}
                className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="QR">QR Code Security Badge</option>
                <option value="TEXT">Printed OCR Text Badge</option>
              </select>
            </div>

            <div>
              <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
                Joining Date
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-mono uppercase text-slate-400 mb-1 text-[11px]">
              Photo Reference (Internal Only)
            </label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Optional internal URL"
              className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <p className="text-[10px] text-slate-500 font-mono italic">
            * Photos are archived strictly for HR ID badges. No biometric or facial recognition is utilized.
          </p>

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
              ADD WORKER
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
