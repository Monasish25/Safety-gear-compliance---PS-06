import React, { useState, useEffect } from "react";
import { 
  Clock, 
  ShieldCheck, 
  Bell, 
  Settings as SettingsIcon, 
  Save, 
  Check, 
  Building,
  RotateCcw,
  Users as UsersIcon,
  ShieldAlert,
  Plus,
  KeyRound,
  UserX,
  UserCheck,
  AlertTriangle,
  Building2,
  Lock,
  Layers
} from "lucide-react";
import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../context/AuthContext";
import { PPEItem, ShiftName, SystemSettings, Zone, User, Role } from "../types";
import { 
  getZones, 
  createZone, 
  updateZone, 
  getUsers, 
  createUser, 
  updateUser, 
  resetUserPassword 
} from "../lib/api";

export const Settings: React.FC = () => {
  const { user, hasRole } = useAuth();
  const { settings, loading, saving, saveSettings, refetch } = useSettings();

  const [activeTab, setActiveTab] = useState<"general" | "zones" | "users">("general");
  const [formData, setFormData] = useState<SystemSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ==========================================
  // ZONES STATE
  // ==========================================
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [editingZone, setEditingZone] = useState<Partial<Zone> | null>(null);

  // ==========================================
  // USERS STATE (HEAD ONLY)
  // ==========================================
  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({ email: "", name: "", role: "SUPERVISOR" as Role, password: "" });
  const [userError, setUserError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData(JSON.parse(JSON.stringify(settings)));
    }
  }, [settings]);

  // Load zones
  const fetchZonesData = async () => {
    try {
      setZonesLoading(true);
      const data = await getZones();
      setZones(data);
    } catch (err) {
      console.error("Failed to load zones:", err);
    } finally {
      setZonesLoading(false);
    }
  };

  // Load users
  const fetchUsersData = async () => {
    if (!hasRole(["HEAD"])) return;
    try {
      setUsersLoading(true);
      const data = await getUsers();
      setUsersList(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "zones") fetchZonesData();
    if (activeTab === "users") fetchUsersData();
  }, [activeTab]);

  if (loading || !formData) {
    return (
      <div className="p-16 text-center text-slate-500 font-mono text-sm glass-panel">
        <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block mr-2" />
        Loading system configuration...
      </div>
    );
  }

  // Handlers for Settings
  const handleShiftTimeChange = (index: number, field: "entryTime" | "endTime", value: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const updatedShifts = [...prev.shifts];
      updatedShifts[index] = { ...updatedShifts[index], [field]: value };
      return { ...prev, shifts: updatedShifts };
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    const res = await saveSettings(formData);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Handlers for Zones
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone || !editingZone.name) return;

    try {
      if (editingZone.id) {
        await updateZone(editingZone.id, editingZone);
      } else {
        await createZone(editingZone as any);
      }
      setEditingZone(null);
      await fetchZonesData();
    } catch (err: any) {
      alert(err?.message || "Failed to save zone");
    }
  };

  // Handlers for Users
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUserError(null);
      await createUser(newUserData);
      setNewUserOpen(false);
      setNewUserData({ email: "", name: "", role: "SUPERVISOR", password: "" });
      await fetchUsersData();
    } catch (err: any) {
      setUserError(err?.message || "Failed to create user");
    }
  };

  const handleToggleUserActive = async (u: User) => {
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      await fetchUsersData();
    } catch (err: any) {
      alert(err?.message || "Failed to update user status");
    }
  };

  const handleResetPassword = async (u: User) => {
    const newPwd = window.prompt(`Enter new password for ${u.name} (${u.email}):`);
    if (!newPwd || newPwd.trim().length < 6) {
      if (newPwd !== null) alert("Password must be at least 6 characters");
      return;
    }
    try {
      await resetUserPassword(u.id, newPwd.trim());
      alert(`Password successfully reset for ${u.name}.`);
    } catch (err: any) {
      alert(err?.message || "Failed to reset password");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            SYSTEM ADMINISTRATION
          </span>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight mt-1">
            Factory Gate Configuration
          </h1>
          <p className="text-xs text-slate-400">
            Shift definitions, zone PPE policies, supervisor access roles, and audit compliance
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 rounded-xl bg-[#0b111c] border border-slate-800">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === "general"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Rules & Shifts</span>
          </button>

          <button
            onClick={() => setActiveTab("zones")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === "zones"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Zones & PPE</span>
          </button>

          {hasRole(["HEAD"]) && (
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                activeTab === "users"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan-sm"
                : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Users (HEAD)</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: RULES & SHIFTS CONFIGURATION                      */}
      {/* ======================================================== */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Shift Timings & Gate Policy
            </span>
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                  <Check className="w-3.5 h-3.5" />
                  <span>Settings Saved</span>
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-semibold font-sans text-xs hover:brightness-110 active:scale-95 transition-all shadow-glow-cyan-sm disabled:opacity-50"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4 text-slate-950" />
                )}
                <span>SAVE CONFIGURATION</span>
              </button>
            </div>
          </div>

          {/* Section 1: Working Hours & Shifts */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="font-heading font-bold text-base text-white">
                FACTORY SHIFT SCHEDULES
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.shifts.map((shift, idx) => (
                <div key={shift.name} className="p-4 rounded-xl bg-[#0b111c] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-sm text-cyan-300 uppercase">
                      {shift.name} Shift
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {shift.name === "Night" ? "Crosses Midnight" : "Standard"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Entry Time</label>
                      <input
                        type="time"
                        value={shift.entryTime}
                        onChange={(e) => handleShiftTimeChange(idx, "entryTime", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">End Time</label>
                      <input
                        type="time"
                        value={shift.endTime}
                        onChange={(e) => handleShiftTimeChange(idx, "endTime", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Attendance Grace & Gate Verification Rules */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="font-heading font-bold text-base text-white">
                TURNSTILE ATTENDANCE RULES
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#0b111c] border border-slate-800 space-y-2">
                <label className="text-xs font-mono text-slate-300 block">
                  Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.rules.gracePeriodMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rules: { ...formData.rules, gracePeriodMinutes: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 block">Check-in after entry + grace = LATE</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0b111c] border border-slate-800 space-y-2">
                <label className="text-xs font-mono text-slate-300 block">
                  Check-In Window Opens (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="120"
                  value={formData.rules.lateAfterMinutes || 60}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rules: { ...formData.rules, lateAfterMinutes: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 block">Window opens 60 mins before shift</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0b111c] border border-slate-800 space-y-2">
                <label className="text-xs font-mono text-slate-300 block">
                  Snapshot Retention (Days)
                </label>
                <input
                  type="number"
                  min="7"
                  max="90"
                  value={formData.rules.retentionDays || 30}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rules: { ...formData.rules, retentionDays: Number(e.target.value) },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 block">Auto-cleanup after period</span>
              </div>
            </div>

            {/* Privacy & Zone Transfer Toggles */}
            <div className="space-y-3 pt-2">
              {/* Transfer Approval Toggle */}
              <div className="p-4 rounded-xl bg-[#0b111c] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-slate-200 font-semibold block">
                    Require Supervisor Approval for Zone Transfers
                  </span>
                  <span className="text-[11px] text-slate-400">
                    When active, workers transferred to an alternative zone will show as PENDING until approved.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.rules.requireTransferApproval}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rules: { ...formData.rules, requireTransferApproval: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>

              {/* Privacy Face Blurring Toggle */}
              <div className="p-4 rounded-xl bg-[#0b111c] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-slate-200 font-semibold block">
                    Biometric Privacy &bull; Face Blurring on Snapshots
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Automatically applies Gaussian blur to face regions on stored gate snapshots. No facial recognition is utilized.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.rules.faceBlurring}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rules: { ...formData.rules, faceBlurring: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>

              {/* NOT_VISIBLE Manual Check Toggle */}
              <div className="p-4 rounded-xl bg-[#0b111c] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-slate-200 font-semibold block">
                    Treat NOT_VISIBLE as Needs Manual Check
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Obscured gear marks entry as NEEDS MANUAL CHECK for supervisor review rather than hard refusal.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.rules.treatNotVisibleAsReview}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rules: { ...formData.rules, treatNotVisibleAsReview: e.target.checked },
                    })
                  }
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 2: WORK ZONES & PPE RULES                            */}
      {/* ======================================================== */}
      {activeTab === "zones" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Factory Work Fields & Mandatory Gear Requirements
            </span>
            <button
              onClick={() =>
                setEditingZone({
                  name: "",
                  capacityPerShift: 30,
                  requiredPpe: { helmet: true, vest: true, shoes: true, gloves: false, goggles: false },
                  isActive: true,
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Work Zone</span>
            </button>
          </div>

          {/* Zones Table */}
          <div className="glass-panel overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b111c] border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Zone Field</th>
                  <th className="py-3 px-4">Capacity / Shift</th>
                  <th className="py-3 px-4">Mandatory PPE Rules</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {zonesLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                      Loading zones configuration...
                    </td>
                  </tr>
                ) : zones.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                      No zones configured yet. Click 'Add Work Zone' above.
                    </td>
                  </tr>
                ) : (
                  zones.map((z) => (
                    <tr key={z.id} className="hover:bg-cyan-500/[0.03]">
                      <td className="py-3 px-4 font-bold text-white">{z.name}</td>
                      <td className="py-3 px-4 text-slate-300">{z.capacityPerShift} Workers</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(z.requiredPpe || {}).map(([k, v]) => (
                            <span
                              key={k}
                              className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                                v
                                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                                  : "bg-slate-800/50 text-slate-600 line-through"
                              }`}
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          z.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-400"
                        }`}>
                          {z.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setEditingZone(z)}
                          className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-300 text-[11px]"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Edit / Create Zone Modal */}
          {editingZone && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="glass-panel w-full max-w-md p-6 border border-cyan-500/40 shadow-2xl relative space-y-4">
                <h3 className="font-heading font-bold text-base text-white">
                  {editingZone.id ? "Edit Work Zone" : "New Factory Zone"}
                </h3>

                <form onSubmit={handleSaveZone} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Zone Name</label>
                    <input
                      type="text"
                      required
                      value={editingZone.name || ""}
                      onChange={(e) => setEditingZone({ ...editingZone, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Capacity Per Shift</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editingZone.capacityPerShift || 30}
                      onChange={(e) => setEditingZone({ ...editingZone, capacityPerShift: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-2">Mandatory Required PPE</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["helmet", "vest", "shoes", "gloves", "goggles"] as PPEItem[]).map((it) => {
                        const isReq = editingZone.requiredPpe?.[it] ?? false;
                        return (
                          <label key={it} className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 cursor-pointer capitalize">
                            <input
                              type="checkbox"
                              checked={isReq}
                              onChange={(e) =>
                                setEditingZone({
                                  ...editingZone,
                                  requiredPpe: {
                                    helmet: editingZone.requiredPpe?.helmet ?? false,
                                    vest: editingZone.requiredPpe?.vest ?? false,
                                    shoes: editingZone.requiredPpe?.shoes ?? false,
                                    gloves: editingZone.requiredPpe?.gloves ?? false,
                                    goggles: editingZone.requiredPpe?.goggles ?? false,
                                    [it]: e.target.checked,
                                  },
                                })
                              }
                              className="accent-cyan-400"
                            />
                            <span>{it}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingZone(null)}
                      className="px-3 py-2 rounded-lg text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold"
                    >
                      Save Zone
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: USERS & OFFICER ROLES (HEAD ONLY)                 */}
      {/* ======================================================== */}
      {activeTab === "users" && hasRole(["HEAD"]) && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Authorized Officers & Clearance Tiers (HEAD ONLY)
            </span>
            <button
              onClick={() => setNewUserOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Officer Account</span>
            </button>
          </div>

          <div className="glass-panel overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0b111c] border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Officer Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Clearance Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                      Loading users directory...
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-cyan-500/[0.03]">
                      <td className="py-3 px-4 font-bold text-white">{u.name}</td>
                      <td className="py-3 px-4 text-slate-300">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          u.role === "HEAD"
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : u.role === "SUPERVISOR"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          u.isActive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                        }`}>
                          {u.isActive ? "ENABLED" : "DISABLED"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-300"
                            title="Reset Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleUserActive(u)}
                            className={`p-1.5 rounded transition-colors ${
                              u.isActive
                                ? "text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                                : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30"
                            }`}
                            title={u.isActive ? "Disable Account" : "Enable Account"}
                          >
                            {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Create User Modal */}
          {newUserOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="glass-panel w-full max-w-md p-6 border border-cyan-500/40 shadow-2xl relative space-y-4">
                <h3 className="font-heading font-bold text-base text-white">
                  Create Officer Account
                </h3>

                {userError && (
                  <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono">
                    {userError}
                  </div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newUserData.name}
                      onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                      placeholder="e.g. Maya Sharma"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      placeholder="officer@factory.internal"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Clearance Role *</label>
                    <select
                      value={newUserData.role}
                      onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as Role })}
                      className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="HEAD">HEAD (Full Plant Administrator)</option>
                      <option value="SUPERVISOR">SUPERVISOR (Gate Operations & Transfers)</option>
                      <option value="VIEWER">VIEWER (Read-Only Telemetry)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Initial Password *</label>
                    <input
                      type="password"
                      required
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-2 rounded-lg bg-[#0b111c] border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setNewUserOpen(false)}
                      className="px-3 py-2 rounded-lg text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold"
                    >
                      Create User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
