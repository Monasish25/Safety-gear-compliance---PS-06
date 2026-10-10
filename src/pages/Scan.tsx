import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Camera, 
  UploadCloud, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RotateCcw, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRightLeft,
  UserCheck,
  Building2,
  FileImage,
  RefreshCw,
  Video,
  VideoOff,
  QrCode,
  X
} from "lucide-react";
import { useScans } from "../hooks/useScans";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/attendance/StatusBadge";
import { PPEChipGroup } from "../components/ppe/PPEChipGroup";
import { uploadScanImage } from "../lib/api";
import { PPEItem, PPEState, DetectedPerson, ScanEvent } from "../types";

export const Scan: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"live" | "upload">("live");
  const { scans, loading: scansLoading, refetch: refetchScans, review } = useScans();
  const { user, hasRole } = useAuth();

  // ==========================================
  // TAB 1: LIVE WEBCAM SCAN STATE
  // ==========================================
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraStatus, setCameraStatus] = useState<"online" | "offline" | "permission_denied">("offline");
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<any>(null);
  const [showTestBadgeModal, setShowTestBadgeModal] = useState(false);
  const [selectedTestWorkerId, setSelectedTestWorkerId] = useState("W-1001");

  // Live Scan Current Result
  const [liveResult, setLiveResult] = useState<{
    confirmed: boolean;
    workerId: string | null;
    workerName: string | null;
    department?: string;
    shift?: string;
    ppeStates: Record<string, { state: PPEState; confidence: number }>;
    decision: string | null;
    reason: string | null;
    debounced: boolean;
    qualityIssues: string[];
  }>({
    confirmed: false,
    workerId: null,
    workerName: null,
    ppeStates: {},
    decision: null,
    reason: null,
    debounced: false,
    qualityIssues: [],
  });

  // Get Camera Devices
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devs) => {
        const videoDevs = devs.filter((d) => d.kind === "videoinput");
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      }).catch(console.error);
    }
  }, [selectedDeviceId]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraStatus("online");
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraStatus("permission_denied");
      } else {
        setCameraStatus("offline");
      }
    }
  }, [selectedDeviceId]);

  // Connect WebSocket when Live Tab is Active
  useEffect(() => {
    if (activeTab !== "live") {
      if (wsRef.current) wsRef.current.close();
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      return;
    }

    startCamera();

    const wsUrl = `ws://${window.location.hostname}:8000/ws/scan`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.box && canvasRef.current && videoRef.current) {
          drawBoundingBoxes(data.box, data.worker?.name || data.confirmedWorkerId || data.rawWorkerId, data.decision);
        } else if (!data.box && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        const resolvedWorkerId = data.confirmedWorkerId || data.rawWorkerId || (data.worker?.workerId ?? null);
        setLiveResult({
          confirmed: data.confirmed || false,
          workerId: resolvedWorkerId,
          workerName: data.worker?.name || null,
          department: data.worker?.department,
          shift: data.worker?.shift,
          ppeStates: data.ppeStates || {},
          decision: data.decision || null,
          reason: data.reason || null,
          debounced: data.debounced || false,
          qualityIssues: data.qualityIssues || [],
        });

        if (data.decision && !data.debounced) {
          refetchScans();
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    // Send frames over WebSocket at 3-4 FPS
    const sendFrame = () => {
      if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const captureCanvas = document.createElement("canvas");
      captureCanvas.width = Math.min(1280, video.videoWidth);
      captureCanvas.height = Math.min(720, video.videoHeight);
      const ctx = captureCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
        const dataUrl = captureCanvas.toDataURL("image/jpeg", 0.70);
        wsRef.current.send(JSON.stringify({ frame: dataUrl }));
      }
    };

    frameIntervalRef.current = setInterval(sendFrame, 280); // ~3.5 FPS

    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (ws.readyState === WebSocket.OPEN) ws.close();
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t) => t.stop());
      }
    };
  }, [activeTab, startCamera, refetchScans]);

  // Draw overlay bounding box on live video canvas
  const drawBoundingBoxes = (box: [number, number, number, number], label: string | null, decision: string | null) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const [x1, y1, x2, y2] = box;
    const isAllowed = decision === "ALLOWED";
    const isDenied = decision === "ACCESS_DENIED";
    const isTransferred = decision === "TRANSFERRED";

    ctx.strokeStyle = isAllowed ? "#10b981" : isDenied ? "#f43f5e" : isTransferred ? "#00f0ff" : "#38bdf8";
    ctx.lineWidth = 3;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    // Dynamic Label Pill
    const displayLabel = label ? `${label}${decision ? ` • ${decision}` : ""}` : "Worker in Gate Zone";
    ctx.font = "bold 12px 'Space Grotesk', monospace";
    const textWidth = Math.max(160, ctx.measureText(displayLabel).width + 24);
    ctx.fillStyle = "rgba(11, 17, 28, 0.90)";
    ctx.fillRect(x1, Math.max(0, y1 - 28), Math.min(textWidth, canvas.width - x1), 26);
    ctx.fillStyle = isAllowed ? "#34d399" : isDenied ? "#f87171" : isTransferred ? "#22d3ee" : "#38bdf8";
    ctx.fillText(displayLabel, x1 + 10, Math.max(18, y1 - 10));
  };

  // ==========================================
  // TAB 2: PHOTO UPLOAD SCAN STATE
  // ==========================================
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordAttendance, setRecordAttendance] = useState<boolean>(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    scanId: string;
    peopleCount: number;
    people: DetectedPerson[];
    annotatedImageUrl: string;
    qualityPassed: boolean;
    qualityIssues: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadResult(null);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    try {
      setUploadLoading(true);
      setUploadError(null);
      const res = await uploadScanImage(selectedFile, recordAttendance);
      setUploadResult(res);
      refetchScans();
    } catch (err: any) {
      setUploadError(err?.message || "Failed to process photo scan");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleReviewAction = async (scanId: string, decision: "ALLOW" | "TRANSFER" | "DENY") => {
    const res = await review(scanId, decision);
    if (!res.success) {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            TURNSTILE SCAN GATE
          </span>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight mt-1">
            PPE Turnstile Verification
          </h1>
          <p className="text-xs text-slate-400">
            Real-time multi-frame badge authentication, zone clearance, and anatomical safety gear detection
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#0b111c] border border-slate-800">
          <button
            onClick={() => setActiveTab("live")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === "live"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>LIVE CAMERA</span>
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === "upload"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>UPLOAD PHOTO</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: LIVE CAMERA VIEW                                  */}
      {/* ======================================================== */}
      {activeTab === "live" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (col-span-8): Camera Viewport */}
          <div className="lg:col-span-7 xl:col-span-8 glass-panel p-5 space-y-4">
            {/* Feed Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span className="font-heading font-bold text-sm text-white">
                  Turnstile Optical Guard
                </span>
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  cameraStatus === "online" && wsConnected
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cameraStatus === "online" && wsConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                  {cameraStatus === "online" && wsConnected ? "LIVE TELEMETRY" : "OFFLINE"}
                </span>
              </div>

              {/* Camera Selector Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0b111c] border border-slate-700 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  {devices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                  {devices.length === 0 && <option value="">Default Web Camera</option>}
                </select>

                <button
                  onClick={startCamera}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
                  title="Reconnect Camera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setShowTestBadgeModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50 text-xs font-mono transition-colors shadow-sm"
                  title="View Sample Worker Badges to test scanner"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Test Badges</span>
                </button>
              </div>
            </div>

            {/* Video Viewport with Canvas Overlay */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Status Message if Camera Permission Refused */}
              {cameraStatus === "permission_denied" && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <VideoOff className="w-12 h-12 text-rose-400" />
                  <p className="text-white font-medium text-sm">Camera Permission Denied</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Enable webcam access in your browser settings to perform live turnstile scanning.
                  </p>
                </div>
              )}

              {/* Guidance Overlay Banner */}
              <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-md border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
                <span>Guidance: Stand 2–3 m from camera, full body visible, show QR badge.</span>
                <span className="text-slate-400 font-sans">Multi-Frame: 70% Over 8 Frames</span>
              </div>
            </div>

            {/* Quality Warning if Detected */}
            {liveResult.qualityIssues.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Quality Notice: {liveResult.qualityIssues.join(" | ")}</span>
              </div>
            )}
          </div>

          {/* Right Column (col-span-4): Result Card & Recent Scans */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            {/* Live Scan Result Card */}
            <div className="glass-panel p-5 space-y-4 border border-cyan-500/30">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-heading font-bold text-white tracking-wide">
                    Scan Decision Card
                  </h3>
                </div>
                {liveResult.decision && (
                  <StatusBadge status={liveResult.decision.toLowerCase() as any} size="sm" />
                )}
              </div>

              {liveResult.workerId ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-sm">
                      {liveResult.workerName ? liveResult.workerName.substring(0, 2).toUpperCase() : "W"}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-white text-sm">
                        {liveResult.workerName || "Recognized Worker"}
                      </p>
                      <p className="font-mono text-cyan-400 text-xs">{liveResult.workerId}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-lg bg-[#0b111c] border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">DEPARTMENT</span>
                      <span className="text-slate-200">{liveResult.department || "Production"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">SHIFT</span>
                      <span className="text-slate-200">{liveResult.shift || "Morning"}</span>
                    </div>
                  </div>

                  {/* PPE Checklist */}
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1.5">
                      5-Point PPE Compliance Check
                    </span>
                    <div className="space-y-1.5">
                      {Object.entries(liveResult.ppeStates).map(([item, val]) => (
                        <div key={item} className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-slate-900/60 border border-slate-800/80">
                          <span className="capitalize text-slate-300">{item}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            val.state === "WORN"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : val.state === "MISSING"
                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}>
                            {val.state} ({Math.round(val.confidence * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {liveResult.reason && (
                    <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-300">
                      Result: {liveResult.reason}
                    </div>
                  )}

                  {liveResult.debounced && (
                    <span className="text-[10px] font-mono text-slate-500 italic block">
                      * Worker scanned within last 30s. Duplicate attendance throttled.
                    </span>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 font-mono text-xs space-y-2">
                  <p>Awaiting worker in gate zone...</p>
                  <p className="text-[10px] text-slate-600">
                    Badge QR token will trigger automated clearance evaluation.
                  </p>
                </div>
              )}
            </div>

            {/* Recent Scans Table */}
            <div className="glass-panel p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-heading font-bold text-white uppercase tracking-wider">
                  Recent Turnstile Scans
                </span>
                <button
                  onClick={() => refetchScans()}
                  className="text-slate-400 hover:text-cyan-400 text-xs font-mono flex items-center gap-1"
                >
                  <RotateCcw className={`w-3 h-3 ${scansLoading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {scans.length === 0 ? (
                <div className="py-6 text-center text-slate-500 font-mono text-xs">
                  No scan events recorded today.
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {scans.slice(0, 8).map((sc) => (
                    <div
                      key={sc.id}
                      className="p-2.5 rounded-lg bg-[#0b111c]/60 border border-slate-800/80 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">
                          {sc.workerName || sc.workerId || "Unknown Worker"}
                        </span>
                        <StatusBadge status={sc.result.toLowerCase() as any} size="sm" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>{sc.workerId || "No Badge"}</span>
                        <span>{sc.time}</span>
                      </div>
                      {sc.needsReview && hasRole(["HEAD", "SUPERVISOR"]) && (
                        <div className="pt-1.5 border-t border-slate-800 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReviewAction(sc.id, "DENY")}
                            className="px-2 py-0.5 rounded text-[10px] font-mono text-rose-400 hover:bg-rose-950/30 border border-rose-500/30"
                          >
                            Deny
                          </button>
                          <button
                            onClick={() => handleReviewAction(sc.id, "ALLOW")}
                            className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 hover:bg-emerald-950/30 border border-emerald-500/30"
                          >
                            Allow
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PHOTO UPLOAD VIEW                                 */}
      {/* ======================================================== */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Upload Input & Configuration Panel */}
          <div className="lg:col-span-5 glass-panel p-5 space-y-4">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="font-heading font-bold text-sm text-white">
                Inspect Image Capture
              </h3>
              <p className="text-xs text-slate-400">
                Single-frame high-resolution audit (JPG, PNG, WEBP &bull; Max 10 MB)
              </p>
            </div>

            {/* Drag & Drop Area */}
            <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-[#0b111c]/40 group">
              <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              <div className="text-center">
                <span className="text-xs font-medium text-slate-200 block">
                  Click to choose file or drag & drop here
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Factory turnstile snapshots, gate CCTV crops
                </span>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {selectedFile && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div className="truncate max-w-[200px]">
                  <span className="font-medium text-slate-200 block truncate">{selectedFile.name}</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="text-xs font-mono text-rose-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Option to record attendance */}
            {hasRole(["HEAD", "SUPERVISOR"]) && (
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-200 block">
                    Record Attendance from Photo
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Applies verified entry if valid QR badge is decoded
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={recordAttendance}
                  onChange={(e) => setRecordAttendance(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
            )}

            <button
              onClick={handleUploadSubmit}
              disabled={!selectedFile || uploadLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 font-semibold text-xs font-sans hover:brightness-110 active:scale-95 transition-all shadow-glow-cyan-sm disabled:opacity-50"
            >
              {uploadLoading ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileImage className="w-4 h-4 text-slate-950" />
              )}
              <span>RUN INSPECTION ANALYSIS</span>
            </button>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Analysis Results Display */}
          <div className="lg:col-span-7 glass-panel p-5 space-y-4">
            <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-white">
                Inspection Result & Annotations
              </h3>
              {uploadResult && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {uploadResult.peopleCount} Person(s) Detected
                </span>
              )}
            </div>

            {/* Annotated Image View */}
            {uploadResult?.annotatedImageUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                <img
                  src={uploadResult.annotatedImageUrl}
                  alt="Annotated detection"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : previewUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-contain opacity-70"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 aspect-video flex flex-col items-center justify-center text-slate-500 font-mono text-xs p-6">
                <span>Upload an image on the left to see annotated detections here.</span>
              </div>
            )}

            {/* Individual Detected Personnel Cards */}
            {uploadResult?.people && uploadResult.people.length > 0 && (
              <div className="space-y-3 mt-4">
                <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                  Personnel Analysis Breakdown
                </h4>
                {uploadResult.people.map((person, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#0b111c]/80 border border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-400 font-mono font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-white">
                          {person.workerName || (person.workerId ? `Worker ${person.workerId}` : "Unidentified Person")}
                        </span>
                        {person.department && (
                          <span className="text-[10px] font-mono text-slate-400">&bull; {person.department}</span>
                        )}
                      </div>
                      {person.decision && (
                        <StatusBadge status={person.decision.toLowerCase() as any} size="sm" />
                      )}
                    </div>

                    {/* PPE Breakdown */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {Object.entries(person.ppe).map(([item, val]) => (
                        <div key={item} className="p-2 rounded bg-slate-900 border border-slate-800 text-center">
                          <span className="text-[10px] uppercase font-mono text-slate-500 block">{item}</span>
                          <span className={`text-[10px] font-mono font-bold ${
                            val.state === "WORN" ? "text-emerald-400" : val.state === "MISSING" ? "text-rose-400" : "text-slate-400"
                          }`}>
                            {val.state}
                          </span>
                          <span className="text-[9px] text-slate-500 block font-mono">
                            {Math.round(val.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>

                    {person.reason && (
                      <div className="text-[11px] font-mono text-slate-300 p-2 rounded bg-slate-900/40 border border-slate-800/80">
                        {person.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TEST BADGE VIEWER MODAL                                  */}
      {/* ======================================================== */}
      {showTestBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 border border-cyan-500/40 shadow-2xl relative animate-popup-expand space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-heading font-bold text-sm text-white">
                    Worker Test QR Badges
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Hold badge up to camera or open on your phone to scan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTestBadgeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Worker Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                Select Test Worker:
              </label>
              <select
                value={selectedTestWorkerId}
                onChange={(e) => setSelectedTestWorkerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0b111c] border border-slate-700 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="W-1001">W-1001: Rajesh Sharma (Production - Welding Bay)</option>
                <option value="W-1002">W-1002: Amit Patel (Production - Welding Bay)</option>
                <option value="W-1013">W-1013: Priya Nair (Assembly - Assembly Line)</option>
                <option value="W-1027">W-1027: Vikas Dubey (Maintenance - Welding Bay)</option>
                <option value="W-1037">W-1037: Vijay Rathi (Warehouse - Warehouse)</option>
                <option value="W-1049">W-1049: Anita Soren (Logistics - Packaging)</option>
                <option value="W-1059">W-1059: Dr. Arvind Swaminathan (Quality - Quality Lab)</option>
              </select>
            </div>

            {/* QR Image Box */}
            <div className="p-4 rounded-2xl bg-white border border-slate-300 flex flex-col items-center justify-center space-y-2 shadow-inner">
              <img
                src={`http://localhost:8000/api/workers/${selectedTestWorkerId}/qr.png`}
                alt={`QR for ${selectedTestWorkerId}`}
                className="w-48 h-48 object-contain"
              />
              <span className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                {selectedTestWorkerId}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => window.open(`http://localhost:8000/api/workers/${selectedTestWorkerId}/qr.png`, "_blank")}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-mono font-medium transition-colors text-center"
              >
                Open in Fullscreen Tab
              </button>
              <button
                onClick={() => setShowTestBadgeModal(false)}
                className="w-full py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono font-medium transition-colors text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
