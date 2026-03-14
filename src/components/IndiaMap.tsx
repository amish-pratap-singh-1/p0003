import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";

// We use SVG-based India map with state paths
// State data encoded as simplified paths for all major states

interface StateData {
  stateId: string;
  count: number;
}

interface IndiaMapProps {
  stateData: StateData[];
  onStateClick?: (stateId: string) => void;
}

// Simplified India SVG viewBox coordinates per state (approximate centroids for labels)
const STATE_PATHS: Record<
  string,
  { d: string; cx: number; cy: number; name: string }
> = {
  JK: {
    name: "J&K",
    cx: 100,
    cy: 60,
    d: "M80,30 L130,25 L145,50 L130,75 L100,80 L75,65 Z",
  },
  HP: {
    name: "HP",
    cx: 155,
    cy: 85,
    d: "M130,75 L160,70 L175,85 L165,100 L145,105 L130,95 Z",
  },
  PB: {
    name: "Punjab",
    cx: 110,
    cy: 100,
    d: "M90,85 L130,80 L130,95 L115,110 L90,110 Z",
  },
  HR: {
    name: "HR",
    cx: 145,
    cy: 120,
    d: "M115,105 L145,100 L155,115 L145,130 L120,132 L110,120 Z",
  },
  DL: {
    name: "Delhi",
    cx: 148,
    cy: 138,
    d: "M140,132 L156,130 L158,140 L150,146 L138,143 Z",
  },
  RJ: {
    name: "Rajasthan",
    cx: 115,
    cy: 175,
    d: "M75,120 L140,115 L148,148 L140,210 L85,220 L60,185 L65,145 Z",
  },
  UP: {
    name: "UP",
    cx: 200,
    cy: 160,
    d: "M148,130 L230,125 L250,145 L245,185 L200,200 L158,195 L145,175 L148,148 Z",
  },
  UT: {
    name: "UK",
    cx: 185,
    cy: 100,
    d: "M158,85 L195,80 L205,100 L190,115 L165,112 L155,100 Z",
  },
  AR: {
    name: "AR",
    cx: 355,
    cy: 95,
    d: "M325,70 L380,65 L390,100 L365,115 L330,108 Z",
  },
  SK: {
    name: "SK",
    cx: 310,
    cy: 105,
    d: "M295,98 L320,95 L325,108 L308,115 L295,110 Z",
  },
  AS: {
    name: "Assam",
    cx: 325,
    cy: 130,
    d: "M285,115 L355,110 L365,130 L350,150 L295,152 L275,140 Z",
  },
  NL: {
    name: "NL",
    cx: 370,
    cy: 140,
    d: "M355,128 L385,125 L390,145 L368,153 L352,148 Z",
  },
  MN: {
    name: "MN",
    cx: 375,
    cy: 165,
    d: "M358,155 L390,152 L395,172 L373,178 L355,172 Z",
  },
  MZ: {
    name: "MZ",
    cx: 360,
    cy: 185,
    d: "M340,175 L378,173 L382,195 L358,198 L335,192 Z",
  },
  TR: {
    name: "TR",
    cx: 335,
    cy: 175,
    d: "M315,165 L342,163 L345,182 L325,188 L310,182 Z",
  },
  ML: {
    name: "ML",
    cx: 315,
    cy: 145,
    d: "M292,135 L340,133 L342,150 L316,158 L290,153 Z",
  },
  BR: {
    name: "Bihar",
    cx: 255,
    cy: 165,
    d: "M220,148 L280,145 L288,170 L275,188 L225,190 L210,175 Z",
  },
  JH: {
    name: "JH",
    cx: 270,
    cy: 200,
    d: "M225,190 L288,188 L298,215 L278,235 L240,235 L218,215 Z",
  },
  WB: {
    name: "WB",
    cx: 305,
    cy: 195,
    d: "M285,158 L325,155 L335,180 L320,220 L298,230 L282,212 L280,185 Z",
  },
  OD: {
    name: "Odisha",
    cx: 285,
    cy: 235,
    d: "M238,210 L295,205 L312,230 L305,265 L270,275 L235,258 L228,235 Z",
  },
  CG: {
    name: "CG",
    cx: 242,
    cy: 228,
    d: "M198,200 L235,195 L240,210 L250,255 L215,265 L190,248 L185,220 Z",
  },
  MP: {
    name: "MP",
    cx: 182,
    cy: 200,
    d: "M140,175 L220,170 L230,195 L220,230 L185,240 L145,235 L125,218 L130,188 Z",
  },
  GJ: {
    name: "Gujarat",
    cx: 105,
    cy: 210,
    d: "M65,175 L128,175 L140,195 L135,240 L100,260 L65,250 L45,225 Z",
  },
  MH: {
    name: "MH",
    cx: 168,
    cy: 268,
    d: "M120,235 L200,228 L225,255 L220,300 L180,320 L140,310 L110,285 Z",
  },
  TS: {
    name: "TS",
    cx: 228,
    cy: 285,
    d: "M200,255 L260,252 L270,278 L255,308 L215,315 L192,300 L190,272 Z",
  },
  AP: {
    name: "AP",
    cx: 242,
    cy: 330,
    d: "M190,295 L268,292 L282,320 L265,360 L230,375 L195,365 L178,338 Z",
  },
  KA: {
    name: "Karnataka",
    cx: 182,
    cy: 320,
    d: "M135,285 L200,280 L215,310 L205,355 L170,370 L135,358 L118,330 Z",
  },
  KL: {
    name: "Kerala",
    cx: 175,
    cy: 378,
    d: "M155,355 L192,352 L195,380 L185,408 L165,415 L148,398 L148,370 Z",
  },
  TN: {
    name: "TN",
    cx: 215,
    cy: 380,
    d: "M190,352 L255,348 L265,380 L245,420 L210,430 L185,415 L185,380 Z",
  },
};

function getColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "#e2e8f0";
  const intensity = count / maxCount;
  if (intensity < 0.2) return "#fee2e2";
  if (intensity < 0.4) return "#fca5a5";
  if (intensity < 0.6) return "#f87171";
  if (intensity < 0.8) return "#ef4444";
  return "#b91c1c";
}

export default function IndiaMap({ stateData, onStateClick }: IndiaMapProps) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const countMap: Record<string, number> = {};
  stateData.forEach((d) => {
    countMap[d.stateId] = d.count;
  });
  const maxCount = Math.max(...stateData.map((d) => d.count), 1);

  const handleClick = (stateId: string) => {
    if (onStateClick) onStateClick(stateId);
    else router.push(`/state/${stateId}`);
  };

  const handleMouseMove = (
    e: React.MouseEvent,
    stateId: string,
    name: string,
  ) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const count = countMap[stateId] || 0;
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      text: `${name}: ${count} ticket${count !== 1 ? "s" : ""}`,
    });
  };

  return (
    <div className="relative w-full" style={{ maxWidth: 520 }}>
      <svg
        ref={svgRef}
        viewBox="40 25 370 420"
        className="w-full h-auto drop-shadow-sm"
        style={{ fontFamily: "sans-serif" }}
      >
        {Object.entries(STATE_PATHS).map(([stateId, { d, cx, cy, name }]) => {
          const count = countMap[stateId] || 0;
          const fill = getColor(count, maxCount);
          return (
            <g
              key={stateId}
              style={{ cursor: "pointer" }}
              onClick={() => handleClick(stateId)}
              onMouseMove={(e) =>
                handleMouseMove(e, stateId, STATE_PATHS[stateId].name)
              }
              onMouseLeave={() => setTooltip(null)}
            >
              <path
                d={d}
                fill={fill}
                stroke="#fff"
                strokeWidth="1.5"
                className="transition-all duration-200 hover:opacity-80 hover:stroke-2"
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                fontSize="6"
                fill="#1e293b"
                style={{ pointerEvents: "none", fontWeight: 600 }}
              >
                {name}
              </text>
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="absolute z-10 bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none shadow-lg"
          style={{ left: tooltip.x + 8, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <span>Fewer tickets</span>
        <div className="flex gap-0.5">
          {[
            "#e2e8f0",
            "#fee2e2",
            "#fca5a5",
            "#f87171",
            "#ef4444",
            "#b91c1c",
          ].map((c) => (
            <div
              key={c}
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <span>More tickets</span>
      </div>
    </div>
  );
}
