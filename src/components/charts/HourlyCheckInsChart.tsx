import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface HourlyCheckInsChartProps {
  data: { time: string; count: number }[];
}

export const HourlyCheckInsChart: React.FC<HourlyCheckInsChartProps> = ({ data }) => {
  return (
    <div className="w-full h-32">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="checkInGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false}
            fontFamily="'JetBrains Mono', monospace"
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={10} 
            tickLine={false}
            fontFamily="'JetBrains Mono', monospace"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-[#0b111c] border border-cyan-500/30 p-2 rounded-lg shadow-xl text-xs font-mono">
                    <div className="text-cyan-400 font-bold">{item.time}</div>
                    <div className="text-white font-semibold">{item.count} worker check-ins</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#00f0ff"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#checkInGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
