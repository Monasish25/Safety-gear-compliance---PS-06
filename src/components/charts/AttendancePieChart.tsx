import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface AttendancePieChartProps {
  present: number;
  late: number;
  absent: number;
}

export const AttendancePieChart: React.FC<AttendancePieChartProps> = ({
  present,
  late,
  absent,
}) => {
  const data = [
    { name: "Present", value: present, color: "#10b981" },
    { name: "Late", value: late, color: "#eab308" },
    { name: "Absent", value: absent, color: "#ef4444" },
  ];

  const total = present + late + absent;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="w-44 h-44 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={52}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                  return (
                    <div className="bg-[#0b111c] border border-cyan-500/30 p-2 rounded-lg shadow-xl text-xs font-mono">
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-slate-300">
                        {item.value} workers ({pct}%)
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center telemetry */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Total</span>
          <span className="font-mono text-xl font-bold text-white">{total}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2.5 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#10b981]" />
          <span className="text-slate-300">Present:</span>
          <span className="text-white font-bold">{present}</span>
          <span className="text-slate-400 text-[11px]">
            ({total > 0 ? ((present / total) * 100).toFixed(1) : 0}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#eab308]" />
          <span className="text-slate-300">Late:</span>
          <span className="text-white font-bold">{late}</span>
          <span className="text-slate-400 text-[11px]">
            ({total > 0 ? ((late / total) * 100).toFixed(1) : 0}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span className="text-slate-300">Absent:</span>
          <span className="text-white font-bold">{absent}</span>
          <span className="text-slate-400 text-[11px]">
            ({total > 0 ? ((absent / total) * 100).toFixed(1) : 0}%)
          </span>
        </div>
      </div>
    </div>
  );
};
