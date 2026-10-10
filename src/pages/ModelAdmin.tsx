import React, { useState, useEffect } from "react";
import { 
  Cpu, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  Activity, 
  Target,
  Zap,
  Database
} from "lucide-react";
import { ModelMetrics } from "../types";
import { getModelMetrics, getExportFeedbackDatasetUrl } from "../lib/api";

export const ModelAdmin: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getModelMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load model evaluation metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleExportFeedback = () => {
    window.open(getExportFeedbackDatasetUrl(), "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            COMPUTER VISION AI ENGINE
          </span>
          <h1 className="text-2xl font-heading font-bold text-white tracking-tight mt-1">
            Vision Model Audit & Telemetry
          </h1>
          <p className="text-xs text-slate-400">
            Fine-tuned Ultralytics YOLO & Pose evaluation benchmarks on held-out factory test sets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportFeedback}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-cyan-500/40 text-xs font-mono transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>EXPORT FEEDBACK DATASET</span>
          </button>

          <button
            onClick={fetchMetrics}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
            title="Refresh Evaluation Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-8 text-center text-rose-400 font-mono text-xs glass-panel space-y-3 border border-rose-500/30">
          <AlertTriangle className="w-6 h-6 mx-auto text-rose-400" />
          <p>{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono hover:bg-rose-500/30 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      ) : loading || !metrics ? (
        <div className="p-16 text-center text-slate-500 font-mono text-sm glass-panel">
          <span className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin inline-block mr-2" />
          Loading model benchmark metrics...
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Active Model</span>
              <p className="font-heading font-bold text-lg text-white">{metrics.version}</p>
              <span className="text-[10px] font-mono text-cyan-400">Device: {metrics.device}</span>
            </div>

            <div className="glass-panel p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Overall mAP50</span>
              <p className="font-heading font-bold text-lg text-cyan-400">{(metrics.mAP50 * 100).toFixed(1)}%</p>
              <span className="text-[10px] font-mono text-slate-400">Target: &ge; 90.0%</span>
            </div>

            <div className="glass-panel p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Mean Precision / Recall</span>
              <p className="font-heading font-bold text-lg text-emerald-400">
                {(metrics.precision * 100).toFixed(1)}% / {(metrics.recall * 100).toFixed(1)}%
              </p>
              <span className="text-[10px] font-mono text-slate-400">Held-Out Test Set</span>
            </div>

            <div className="glass-panel p-4 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Supervisor Corrections</span>
              <p className="font-heading font-bold text-lg text-amber-400">{metrics.feedbackCount} Samples</p>
              <span className="text-[10px] font-mono text-slate-400">Feedback Active</span>
            </div>
          </div>

          {/* Per-Class Compliance Matrix vs Production SLA Targets */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <h3 className="font-heading font-bold text-sm text-white">
                  Per-Class Production Accuracy vs SLA Targets
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Evaluation target: Helmet/Vest &ge; 95% &bull; Gloves/Goggles/Shoes &ge; 90%
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0b111c] border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                  <tr>
                    <th className="py-3 px-4">PPE Class</th>
                    <th className="py-3 px-4">Target Precision / Recall</th>
                    <th className="py-3 px-4">Measured Precision</th>
                    <th className="py-3 px-4">Measured Recall</th>
                    <th className="py-3 px-4">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.entries(metrics.perClass || {}).map(([className, vals]) => {
                    const isHighPrio = className === "helmet" || className === "vest";
                    const target = isHighPrio ? 0.95 : 0.90;
                    const meetsP = vals.precision >= target;
                    const meetsR = vals.recall >= target;
                    const compliant = meetsP && meetsR;

                    return (
                      <tr key={className} className="hover:bg-cyan-500/[0.03]">
                        <td className="py-3 px-4 font-semibold text-slate-100 capitalize">
                          {className}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          &ge; {(target * 100).toFixed(0)}%
                        </td>
                        <td className="py-3 px-4">
                          <span className={meetsP ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                            {(vals.precision * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={meetsR ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                            {(vals.recall * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {compliant ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              MEETS TARGET
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              BELOW TARGET (RETRAINING RECOMMENDED)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Architecture & Training Pipelines Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-panel p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h4 className="font-heading font-bold text-sm text-white">Inference Engine</h4>
              </div>
              <ul className="text-xs font-mono text-slate-300 space-y-2">
                <li>&bull; Backend: Ultralytics YOLO11 / YOLOv8 + ONNX Runtime</li>
                <li>&bull; Pose Association: YOLO11-Pose (17 Keypoints)</li>
                <li>&bull; CUDA Acceleration: {metrics.cudaAvailable ? "ENABLED (NVIDIA GPU)" : "CPU Fallback"}</li>
                <li>&bull; Inference Latency: &le; 150 ms target</li>
              </ul>
            </div>

            <div className="glass-panel p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Database className="w-4 h-4 text-cyan-400" />
                <h4 className="font-heading font-bold text-sm text-white">Retraining Workflow</h4>
              </div>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                Supervisor corrections from "NEEDS MANUAL CHECK" decisions are archived in the database.
                Click "Export Feedback Dataset" to bundle annotations and photos into YOLO format for `ml/train.py`.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
