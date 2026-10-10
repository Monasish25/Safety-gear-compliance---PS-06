import React, { useState } from "react";
import { PPEItem, PPEState } from "../../types";
import { 
  HardHat, 
  ShieldAlert, 
  Glasses, 
  Footprints, 
  Hand,
  Check,
  X,
  EyeOff
} from "lucide-react";

interface PPEChipProps {
  item: PPEItem;
  state: PPEState;
  showLabel?: boolean;
}

const PPE_INFO: Record<PPEItem, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  helmet: { label: "Helmet", icon: HardHat },
  vest: { label: "High-Vis Vest", icon: ShieldAlert },
  shoes: { label: "Safety Shoes", icon: Footprints },
  gloves: { label: "Work Gloves", icon: Hand },
  goggles: { label: "Safety Goggles", icon: Glasses },
};

export const PPEChip: React.FC<PPEChipProps> = ({ item, state, showLabel = false }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const info = PPE_INFO[item] || { label: item, icon: HardHat };
  const Icon = info.icon;

  let colorClasses = "bg-slate-800/80 text-slate-400 border-slate-700/60";
  let stateIcon = <EyeOff className="w-2.5 h-2.5 text-slate-400" />;
  let stateText = "NOT VISIBLE";

  if (state === "WORN") {
    colorClasses = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50";
    stateIcon = <Check className="w-2.5 h-2.5 text-emerald-400" />;
    stateText = "WORN";
  } else if (state === "MISSING") {
    colorClasses = "bg-rose-500/15 text-rose-400 border-rose-500/40 hover:border-rose-500/60";
    stateIcon = <X className="w-2.5 h-2.5 text-rose-400" />;
    stateText = "MISSING";
  }

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`flex items-center gap-1 px-1.5 py-1 rounded border text-xs font-mono transition-all cursor-help ${colorClasses}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {showLabel && <span className="font-sans text-[11px] font-medium">{info.label}</span>}
        <span className="ml-0.5">{stateIcon}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded bg-[#0b111c] border border-cyan-500/30 text-white text-[11px] whitespace-nowrap shadow-xl z-50 pointer-events-none">
          <div className="font-semibold text-slate-200">{info.label}</div>
          <div className="text-[10px] font-mono tracking-wider">
            Status: <span className={state === "WORN" ? "text-emerald-400 font-bold" : state === "MISSING" ? "text-rose-400 font-bold" : "text-slate-400 font-bold"}>{stateText}</span>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#0b111c]" />
        </div>
      )}
    </div>
  );
};
