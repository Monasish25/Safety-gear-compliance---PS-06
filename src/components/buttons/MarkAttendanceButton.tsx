import React, { useState, useRef, useEffect } from "react";
import { UserCheck, Check, Clock, X, AlertCircle } from "lucide-react";
import { Worker } from "../../types";

interface MarkAttendanceButtonProps {
  workers: Worker[];
  onCheckIn: (workerId: string) => Promise<{ success: boolean; error?: string }>;
  onCheckOut: (workerId: string) => Promise<{ success: boolean; error?: string }>;
}

export const MarkAttendanceButton: React.FC<MarkAttendanceButtonProps> = ({
  workers,
  onCheckIn,
  onCheckOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"in" | "out" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsDropdownOpen(false);
        setMessage(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsDropdownOpen(false);
        setMessage(null);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const filteredWorkers = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.workerId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedWorker = workers.find((w) => w.workerId === selectedWorkerId);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    setMessage(null);
    if (!selectedWorkerId && workers.length > 0) {
      setSelectedWorkerId(workers[0].workerId);
      setSearchQuery(`${workers[0].workerId} – ${workers[0].name}`);
    }
  };

  const handleCheckInClick = async () => {
    if (!selectedWorkerId) return;
    setLoadingAction("in");
    setMessage(null);
    const res = await onCheckIn(selectedWorkerId);
    setLoadingAction(null);
    if (res.success) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessage({
        type: "success",
        text: `${timeStr} CHECKED IN: Marked as Present (Manual Tagged)`,
      });
      setTimeout(() => {
        setIsOpen(false);
        setMessage(null);
      }, 1400);
    } else {
      setMessage({
        type: "error",
        text: res.error || "Cannot check in",
      });
    }
  };

  const handleCheckOutClick = async () => {
    if (!selectedWorkerId) return;
    setLoadingAction("out");
    setMessage(null);
    const res = await onCheckOut(selectedWorkerId);
    setLoadingAction(null);
    if (res.success) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessage({
        type: "success",
        text: `${timeStr} CHECKED OUT: Working hours logged`,
      });
      setTimeout(() => {
        setIsOpen(false);
        setMessage(null);
      }, 1400);
    } else {
      setMessage({
        type: "error",
        text: res.error || "Cannot check out",
      });
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button with active scaling and subtle cyan glow */}
      <button
        onClick={handleOpen}
        className={`group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
          isOpen
            ? "scale-[0.97] bg-cyan-400 text-slate-950 shadow-glow-cyan"
            : "bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-glow-cyan-sm hover:shadow-glow-cyan hover:brightness-105 active:scale-[0.97]"
        }`}
      >
        <UserCheck className="w-4 h-4 text-slate-950 transition-transform group-hover:scale-110" />
        <span className="font-semibold tracking-wide">MARK ATTENDANCE</span>
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950/20 text-slate-950 font-bold ml-0.5">
          Manual
        </span>
      </button>

      {/* Special Compact Popup Expanding from Button (Opacity + Scale + Translate ~200ms) */}
      {isOpen && (
        <div
          ref={popupRef}
          className="absolute right-0 top-full mt-2 w-84 z-50 glass-panel p-4 shadow-2xl border border-cyan-500/30 animate-popup-expand"
          style={{ width: "21rem" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
            <div>
              <h4 className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
                MARK ATTENDANCE
              </h4>
              <p className="text-[11px] text-slate-400">Supervisor Manual Override</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Worker Searchable Selector */}
          <div className="mb-3 relative">
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Select Worker:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                placeholder="Search Worker ID or Name..."
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0b111c] border border-slate-700 focus:border-cyan-500 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
              />
              {selectedWorker && !isDropdownOpen && (
                <div className="text-[10px] text-slate-400 mt-1 font-sans flex items-center justify-between">
                  <span>{selectedWorker.department} &bull; {selectedWorker.shift} Shift</span>
                  <span className="font-mono text-cyan-400">{selectedWorker.workerId}</span>
                </div>
              )}
            </div>

            {/* Dropdown list */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-40 overflow-y-auto bg-[#0b111c] border border-cyan-500/30 rounded-lg shadow-xl z-50 py-1">
                {filteredWorkers.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500">No worker matched</div>
                ) : (
                  filteredWorkers.map((w) => (
                    <button
                      key={w.workerId}
                      type="button"
                      onClick={() => {
                        setSelectedWorkerId(w.workerId);
                        setSearchQuery(`${w.workerId} – ${w.name}`);
                        setIsDropdownOpen(false);
                        setMessage(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-cyan-500/10 hover:text-cyan-300 flex items-center justify-between transition-colors border-b border-slate-800/50 last:border-0"
                    >
                      <div>
                        <div className="text-slate-200 font-medium">{w.name}</div>
                        <div className="text-[10px] text-slate-400">{w.department}</div>
                      </div>
                      <span className="font-mono text-[11px] text-cyan-400 font-semibold">{w.workerId}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Feedback message (inline duplicate prevention or success) */}
          {message && (
            <div
              className={`mb-3 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                message.type === "error"
                  ? "bg-rose-950/40 border border-rose-500/40 text-rose-300"
                  : "bg-emerald-950/40 border border-emerald-500/40 text-emerald-300"
              }`}
            >
              {message.type === "error" ? (
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-400" />
              ) : (
                <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
              )}
              <span className="text-[11px] leading-tight font-medium">{message.text}</span>
            </div>
          )}

          {/* Action Buttons: Check In and Check Out */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={handleCheckInClick}
              disabled={loadingAction !== null || !selectedWorkerId}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 active:scale-95 transition-all text-xs font-semibold font-mono disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingAction === "in" ? (
                <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              CHECK IN
            </button>

            <button
              onClick={handleCheckOutClick}
              disabled={loadingAction !== null || !selectedWorkerId}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 active:scale-95 transition-all text-xs font-semibold font-mono disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingAction === "out" ? (
                <span className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Clock className="w-3.5 h-3.5" />
              )}
              CHECK OUT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
