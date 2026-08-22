import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

/**
 * Sparkline
 * Minimal trend line used inside stat cards and insight panels.
 */
export default function Sparkline({ data, color, height = 44 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
