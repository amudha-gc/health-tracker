import React, { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush, ResponsiveContainer,
} from "recharts";

function normalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!isFinite(min) || !isFinite(max) || max === min) return values.map(() => 0.5);
  return values.map(v => (v - min) / (max - min));
}

export default function MetricsCharts({ data }) {
  const [overlay, setOverlay] = useState(false);

  const overlayData = useMemo(() => {
    const stepsArr = data.map(d => Number(d.steps ?? 0));
    const hrArr = data.map(d => Number(d.heart_rate ?? 0));
    const stepsNorm = normalize(stepsArr);
    const hrNorm = normalize(hrArr);
    return data.map((d, i) => ({
      date: d.date, steps_norm: stepsNorm[i], hr_norm: hrNorm[i],
    }));
  }, [data]);

  const axisTick = { fontSize: 12, fill: "#9fb1cc" };
  const gridStroke = "#2a3852";

  return (
    <div className="w-full space-y-5">
      {/* Header + Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 rounded bg-gradient-to-b from-[var(--accent-2)] to-[var(--accent)]" />
          <h2 className="text-xl md:text-2xl font-semibold text-white">Performance Trend</h2>
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm text-[var(--muted)]">Overlay</span>
          <input
            type="checkbox"
            checked={overlay}
            onChange={(e) => setOverlay(e.target.checked)}
            className="peer sr-only"
            aria-label="Toggle overlay view"
          />
          <span className="relative inline-block h-6 w-11 rounded-full bg-[#1c2741] transition peer-checked:bg-[var(--accent-2)]">
            <span className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      {!overlay ? (
        <div className="space-y-8">
          <div className="h-72 w-full glass rounded-xl p-2">
            <ResponsiveContainer>
              <LineChart data={data} syncId="metrics">
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={axisTick} stroke="#9fb1cc" />
                <YAxis tick={axisTick} stroke="#9fb1cc" />
                <Tooltip
                  contentStyle={{ background: "#0f1a2f", border: "1px solid #2a3852", borderRadius: 12, color: "#e6efff" }}
                  labelStyle={{ color: "#9fb1cc" }}
                />
                <Legend wrapperStyle={{ color: "#9fb1cc" }} />
                <Line type="monotone" dataKey="steps" name="Steps" dot={false} strokeWidth={3} stroke="#2bd4ff" />
                <Brush dataKey="date" height={20} fill="#0f1a2f" stroke="#2a3852" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-72 w-full glass rounded-xl p-2">
            <ResponsiveContainer>
              <LineChart data={data} syncId="metrics">
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="date" tick={axisTick} stroke="#9fb1cc" />
                <YAxis tick={axisTick} stroke="#9fb1cc" />
                <Tooltip
                  contentStyle={{ background: "#0f1a2f", border: "1px solid #2a3852", borderRadius: 12, color: "#e6efff" }}
                  labelStyle={{ color: "#9fb1cc" }}
                />
                <Legend wrapperStyle={{ color: "#9fb1cc" }} />
                <Line type="monotone" dataKey="heart_rate" name="Heart Rate" dot={false} strokeWidth={3} stroke="#35f4c0" />
                <Brush dataKey="date" height={20} fill="#0f1a2f" stroke="#2a3852" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="h-[28rem] w-full glass rounded-xl p-2">
          <ResponsiveContainer>
            <LineChart data={overlayData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="date" tick={axisTick} stroke="#9fb1cc" />
              <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={axisTick} stroke="#9fb1cc" />
              <Tooltip
                formatter={(v, n) => [`${Math.round(v * 100)}%`, n]}
                contentStyle={{ background: "#0f1a2f", border: "1px solid #2a3852", borderRadius: 12, color: "#e6efff" }}
                labelStyle={{ color: "#9fb1cc" }}
              />
              <Legend wrapperStyle={{ color: "#9fb1cc" }} />
              <Line type="monotone" dataKey="steps_norm" name="steps (norm.)" dot={false} strokeWidth={3} stroke="#2bd4ff" />
              <Line type="monotone" dataKey="hr_norm" name="heart_rate (norm.)" dot={false} strokeWidth={3} stroke="#35f4c0" />
              <Brush dataKey="date" height={20} fill="#0f1a2f" stroke="#2a3852" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
