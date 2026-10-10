import React from "react";
import { PPEItem } from "../../types";

interface PPEViolationData {
  item: PPEItem;
  name: string;
  count: number;
}

interface PPEComplianceBarChartProps {
  data: PPEViolationData[];
}

export const PPEComplianceBarChart: React.FC<PPEComplianceBarChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-3 w-full">
      {data.map((item) => {
        const percentage = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.item} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-medium">{item.name}</span>
              <span className="text-rose-400 font-semibold">{item.count} denied</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden relative border border-slate-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500"
                style={{ width: `${item.count === 0 ? 0 : Math.max(percentage, 8)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
