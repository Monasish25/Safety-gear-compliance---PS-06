import React, { useState } from "react";
import { X, QrCode, Download, Printer, RefreshCw, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Worker } from "../../types";
import { regenerateWorkerQr, getWorkerQrCodeImageUrl } from "../../lib/api";

interface WorkerBadgeModalProps {
  worker: Worker | null;
  isOpen: boolean;
  onClose: () => void;
  onWorkerUpdated?: (updated: Worker) => void;
}

export const WorkerBadgeModal: React.FC<WorkerBadgeModalProps> = ({
  worker,
  isOpen,
  onClose,
  onWorkerUpdated,
}) => {
  const [regenerating, setRegenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !worker) return null;

  const qrImageUrl = getWorkerQrCodeImageUrl(worker.workerId);

  const handleDownloadQr = () => {
    const a = document.createElement("a");
    a.href = qrImageUrl;
    a.download = `${worker.workerId}_badge_qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintBadge = () => {
    window.print();
  };

  const handleRegenerateQr = async () => {
    if (!window.confirm(`Are you sure you want to regenerate the QR code for ${worker.name}? The previous QR badge will be permanently revoked.`)) {
      return;
    }
    try {
      setRegenerating(true);
      setError(null);
      setMessage(null);
      const res = await regenerateWorkerQr(worker.workerId);
      setMessage("QR token regenerated successfully! Old QR badge has been revoked.");
      if (onWorkerUpdated) {
        onWorkerUpdated({
          ...worker,
          qrToken: res.qrToken,
          qrIssuedAt: new Date().toISOString(),
          qrRevoked: false,
        });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to regenerate QR token");
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 border border-cyan-500/30 shadow-2xl relative animate-popup-expand max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-white">
                Worker Security ID Badge
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Cryptographically Signed HMAC-SHA256 Token
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

        {/* Status / Alert */}
        {message && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Badge Card for Preview and Printing */}
        <div id="printable-badge" className="mt-5 p-5 rounded-2xl bg-[#090d16] border border-cyan-500/40 shadow-2xl relative overflow-hidden">
          {/* Top Brand Banner */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="font-heading font-bold text-xs tracking-wider text-white uppercase">
                SMART ATTENDANCE &bull; BADGE
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {worker.shift} SHIFT
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
            {/* QR Code Container */}
            <div className="flex flex-col items-center">
              <div className="p-2.5 bg-white rounded-xl shadow-lg border-2 border-cyan-500/30">
                <img
                  src={qrImageUrl}
                  alt={`QR for ${worker.workerId}`}
                  className="w-36 h-36 object-contain"
                />
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-2">
                Scan via Turnstile Camera
              </span>
            </div>

            {/* Worker Credentials */}
            <div className="flex-1 space-y-2.5 text-left w-full">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                  WORKER NAME
                </span>
                <span className="font-heading font-bold text-base text-white">
                  {worker.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                    WORKER ID
                  </span>
                  <span className="font-mono font-bold text-cyan-400">
                    {worker.workerId}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                    ROLE / POSITION
                  </span>
                  <span className="text-slate-300 font-medium">
                    {worker.position}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                    DEPARTMENT
                  </span>
                  <span className="text-slate-300">
                    {worker.department}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                    DEFAULT ZONE
                  </span>
                  <span className="text-cyan-300 font-mono text-[11px]">
                    {worker.defaultZoneName || "General Bay"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-500">
                <span>Enrolled: {worker.joiningDate}</span>
                <span className="mx-2">&bull;</span>
                <span className={worker.qrRevoked ? "text-rose-400" : "text-emerald-400"}>
                  {worker.qrRevoked ? "REVOKED" : "VERIFIED BADGE"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={handleRegenerateQr}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-mono hover:bg-amber-950/30 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
            <span>Regenerate QR</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadQr}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-cyan-500/40 text-xs font-mono transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={handlePrintBadge}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-semibold text-xs font-sans hover:brightness-110 active:scale-95 transition-all shadow-glow-cyan-sm"
            >
              <Printer className="w-3.5 h-3.5 text-slate-950" />
              <span>Print Badge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
