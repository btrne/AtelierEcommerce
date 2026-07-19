"use client";

import { useState } from "react";

interface PieChartData {
  label: string
  value: number
  color: string
}

interface PieChartProps {
  data: PieChartData[]
  size?: number
  innerRadius?: number
  formatter?: (value: number) => string
}

export default function PieChart({
  data,
  size = 200,
  innerRadius = 55,
  formatter = (v) => String(v),
}: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="font-body-md text-on-surface-variant italic text-center">Không có dữ liệu</p>
      </div>
    );
  }

  const strokeWidth = (size - innerRadius * 2) / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const offsets: number[] = [];
  let cumulative = 0;
  for (let i = 0; i < data.length; i++) {
    const percent = data[i].value / total;
    const segLength = percent * circumference;
    offsets.push(-cumulative);
    cumulative += segLength;
  }

  const hoveredData = hoveredIndex !== null && data[hoveredIndex];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {data.map((d, i) => {
            const percent = d.value / total;
            const segLength = percent * circumference;
            const offset = offsets[i];
            return (
              <circle
                key={"slice-" + i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segLength} ${circumference - segLength}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-opacity"
                style={{ opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.35, cursor: "pointer" }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
          <circle cx={center} cy={center} r={innerRadius} fill="#fcf9f8" />
        </svg>

        {hoveredData && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none bg-surface-container border border-outline-variant shadow-lg px-3 py-2 text-center z-20"
          >
            <p className="font-label-caps text-label-caps text-primary whitespace-nowrap">{hoveredData.label}</p>
            <p className="font-body-md text-body-md font-bold whitespace-nowrap">{formatter(hoveredData.value)}</p>
            <p className="font-body-md text-body-md text-on-surface-variant whitespace-nowrap">
              {total > 0 ? ((hoveredData.value / total) * 100).toFixed(1) : 0}%
            </p>
          </div>
        )}
      </div>

      {data.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
          {data
            .filter((d) => d.value > 0)
            .map((d, i) => (
              <div key={"legend-" + i} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 flex-shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className="font-body-md text-[11px] text-on-surface-variant whitespace-nowrap">
                  {d.label}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
