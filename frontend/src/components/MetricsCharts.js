import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ResponsiveContainer,
} from "recharts";
import { Activity, Heart, LayoutGrid, Layers, ZoomIn } from "lucide-react";

function normalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!isFinite(min) || !isFinite(max) || max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

const axisTick = { fontSize: 11, fill: "#9fb1cc" };
const gridStroke = "#2a3852";

const CustomTooltip = ({ active, payload, label, overlay }) => {
  if (!(active && payload && payload.length)) return null;
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0f1a2f 0%, #1a2540 100%)",
        border: "1px solid #2a3852",
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <p style={{ color: "#9fb1cc", marginBottom: 8, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: "4px 0", fontSize: 14 }}>
          <strong>{p.name}:</strong>{" "}
          {overlay ? `${Math.round(p.value * 100)}%` : Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// High-contrast custom brush handle
const BrushHandle = ({ x, y, height }) => {
  const w = 12; // matches travellerWidth
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={w} height={height} rx={6} ry={6} fill="#12203a" stroke="#6ee7ff" />
      <path d="M4 5 v14 M8 5 v14" stroke="#6ee7ff" strokeWidth="1.25" opacity="0.8" />
    </g>
  );
};

// Perf: hide dots on dense datasets; show when zoomed/filtered
const makeDot = (stroke, show) =>
  show
    ? ({ cx, cy }) => (
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={stroke}
          stroke="#fff"
          strokeWidth={2}
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
        />
      )
    : false;

export default function MetricsCharts({ data }) {
  const [overlay, setOverlay] = useState(false);
  const isDense = data.length > 200; // tune threshold for performance

  const overlayData = useMemo(() => {
    const stepsArr = data.map((d) => Number(d.steps ?? 0));
    const hrArr = data.map((d) => Number(d.heart_rate ?? 0));
    const stepsNorm = normalize(stepsArr);
    const hrNorm = normalize(hrArr);
    return data.map((d, i) => ({
      date: d.date,
      steps_norm: stepsNorm[i],
      hr_norm: hrNorm[i],
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16">
        <Activity className="w-20 h-20 mx-auto mb-4 text-gray-700" />
        <p className="text-[var(--muted)] text-lg">No data yet. Add your first entry to see trends!</p>
      </div>
    );
    }

  return (
    <div className="w-full space-y-6">
      {/* Header + prominent toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 rounded bg-gradient-to-b from-[var(--accent-2)] to-[var(--accent)]" />
          <h2 className="text-2xl md:text-3xl font-bold text-white">Performance Trends</h2>
        </div>

        <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-800 shadow-lg">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Separate</span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={overlay}
              onChange={(e) => setOverlay(e.target.checked)}
              className="sr-only"
              aria-label="Toggle overlay view"
            />
            <div className="w-16 h-8 rounded-full transition-all duration-300 shadow-inner bg-gray-700 data-[on=true]:bg-gradient-to-r data-[on=true]:from-blue-500 data-[on=true]:to-cyan-500"
                 data-on={overlay}>
              <div
                className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center"
                style={{ transform: overlay ? "translateX(32px)" : "translateX(0px)" }}
              >
                {overlay ? <Layers className="w-4 h-4 text-blue-600" /> : <LayoutGrid className="w-4 h-4 text-gray-600" />}
              </div>
            </div>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">Overlay</span>
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="flex items-start gap-3 text-sm bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-lg px-4 py-3 border border-blue-800/40">
        <ZoomIn className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-200 font-semibold mb-1">📊 Zoom & Navigate</p>
          <p className="text-blue-300/80 text-xs leading-relaxed">
            Drag the slider at the bottom to zoom a date range • Hover points to see exact values •{" "}
            <span className="text-blue-100">{data.length} points loaded</span>
          </p>
        </div>
      </div>

      {/* SEPARATE MODE */}
      {!overlay ? (
        <div className="space-y-8">
          {/* Steps */}
          <div className="glass rounded-xl p-4 border border-gray-800 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-[var(--accent-2)] to-blue-500">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">Daily Steps</h3>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer>
                <LineChart data={data} syncId="metrics" margin={{ top: 10, right: 24, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="date"
                    tick={axisTick}
                    stroke="#9fb1cc"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval="preserveStartEnd"
                    minTickGap={12}
                  />
                  <YAxis tick={axisTick} stroke="#9fb1cc" tickFormatter={(v) => v.toLocaleString()} />
                  <Tooltip content={<CustomTooltip overlay={false} />} />
                  <Legend wrapperStyle={{ color: "#9fb1cc", paddingTop: 12 }} iconType="line" />
                  <Line
                    type="monotone"
                    dataKey="steps"
                    name="Steps"
                    stroke="#2bd4ff"
                    strokeWidth={3}
                    dot={makeDot("#2bd4ff", !isDense)}
                    activeDot={isDense ? false : { r: 6, strokeWidth: 3 }}
                    connectNulls
                  />
                  {/* Let Brush auto-place at the bottom; no manual y */}
                  <Brush
                    dataKey="date"
                    height={36}
                    fill="rgba(43, 212, 255, 0.12)"
                    stroke="#2bd4ff"
                    travellerWidth={12}
                    traveller={<BrushHandle />}
                  >
                    <LineChart>
                      <Line type="monotone" dataKey="steps" stroke="#2bd4ff" strokeWidth={2} dot={false} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-blue-400">
              <ZoomIn className="w-4 h-4" />
              <span>Drag the blue slider to zoom</span>
            </div>
          </div>

          {/* Heart Rate */}
          <div className="glass rounded-xl p-4 border border-gray-800 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-red-500 to-pink-600">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">Heart Rate</h3>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer>
                <LineChart data={data} syncId="metrics" margin={{ top: 10, right: 24, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="date"
                    tick={axisTick}
                    stroke="#9fb1cc"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval="preserveStartEnd"
                    minTickGap={12}
                  />
                  <YAxis tick={axisTick} stroke="#9fb1cc" domain={["dataMin - 5", "dataMax + 5"]} />
                  <Tooltip content={<CustomTooltip overlay={false} />} />
                  <Legend wrapperStyle={{ color: "#9fb1cc", paddingTop: 12 }} iconType="line" />
                  <Line
                    type="monotone"
                    dataKey="heart_rate"
                    name="Heart Rate (bpm)"
                    stroke="#35f4c0"
                    strokeWidth={3}
                    dot={makeDot("#35f4c0", !isDense)}
                    activeDot={isDense ? false : { r: 6, strokeWidth: 3 }}
                    connectNulls
                  />
                  <Brush
                    dataKey="date"
                    height={36}
                    fill="rgba(255, 91, 110, 0.12)"
                    stroke="#35f4c0"
                    travellerWidth={12}
                    traveller={<BrushHandle />}
                  >
                    <LineChart>
                      <Line type="monotone" dataKey="heart_rate" stroke="#35f4c0" strokeWidth={2} dot={false} />
                    </LineChart>
                  </Brush>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-red-400">
              <ZoomIn className="w-4 h-4" />
              <span>Drag the red slider to zoom</span>
            </div>
          </div>
        </div>
      ) : (
        // OVERLAY MODE
        <div className="glass rounded-xl p-4 border border-gray-800 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-wide">Normalized Overlay</h3>
              <p className="text-xs text-[var(--muted)]">Both metrics scaled to 0–100% for comparison</p>
            </div>
          </div>
          <div className="h-[32rem] w-full">
            <ResponsiveContainer>
              <LineChart data={overlayData} margin={{ top: 10, right: 24, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="date"
                  tick={axisTick}
                  stroke="#9fb1cc"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  tick={axisTick}
                  stroke="#9fb1cc"
                />
                <Tooltip content={<CustomTooltip overlay />} />
                <Legend wrapperStyle={{ color: "#9fb1cc", paddingTop: 12 }} iconType="line" />
                <Line
                  type="monotone"
                  dataKey="steps_norm"
                  name="Steps (normalized)"
                  stroke="#2bd4ff"
                  strokeWidth={3}
                  dot={makeDot("#2bd4ff", !isDense)}
                  activeDot={isDense ? false : { r: 6, strokeWidth: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="hr_norm"
                  name="Heart Rate (normalized)"
                  stroke="#35f4c0"
                  strokeWidth={3}
                  dot={makeDot("#35f4c0", !isDense)}
                  activeDot={isDense ? false : { r: 6, strokeWidth: 3 }}
                  connectNulls
                />
                <Brush
                  dataKey="date"
                  height={36}
                  fill="rgba(53, 244, 192, 0.12)"
                  stroke="#35f4c0"
                  travellerWidth={12}
                  traveller={<BrushHandle />}
                >
                  <LineChart>
                    <Line type="monotone" dataKey="steps_norm" stroke="#2bd4ff" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="hr_norm" stroke="#35f4c0" strokeWidth={2} dot={false} />
                  </LineChart>
                </Brush>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-cyan-400">
            <ZoomIn className="w-4 h-4" />
            <span>Drag the green slider to zoom both series</span>
          </div>
        </div>
      )}
    </div>
  );
}
