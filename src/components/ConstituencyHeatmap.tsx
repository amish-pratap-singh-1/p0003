interface ConstituencyData {
  name: string;
  count: number;
}

interface ConstituencyHeatmapProps {
  data: ConstituencyData[];
  selectedConstituency?: string;
  onSelect: (c: string) => void;
}

function getBarColor(intensity: number): string {
  if (intensity < 0.2) return "#dbeafe";
  if (intensity < 0.4) return "#93c5fd";
  if (intensity < 0.6) return "#3b82f6";
  if (intensity < 0.8) return "#1d4ed8";
  return "#1e3a8a";
}

export default function ConstituencyHeatmap({
  data,
  selectedConstituency,
  onSelect,
}: ConstituencyHeatmapProps) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
        <span>Fewer tickets</span>
        <div className="flex gap-0.5">
          {["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"].map((c) => (
            <div
              key={c}
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <span>More tickets</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {data.map(({ name, count }) => {
          const intensity = count / max;
          const bg = getBarColor(intensity);
          const isSelected = selectedConstituency === name;
          return (
            <button
              key={name}
              onClick={() => onSelect(name)}
              className={`rounded-lg p-3 text-left transition-all duration-150 border-2 ${
                isSelected
                  ? "border-blue-600 scale-105 shadow-md"
                  : "border-transparent hover:border-blue-300"
              }`}
              style={{ backgroundColor: bg }}
            >
              <div
                className="text-xs font-semibold truncate"
                style={{ color: intensity > 0.5 ? "#fff" : "#1e293b" }}
              >
                {name}
              </div>
              <div
                className="text-lg font-bold mt-1"
                style={{ color: intensity > 0.5 ? "#fff" : "#1e3a8a" }}
              >
                {count}
              </div>
              <div
                className="text-xs opacity-70"
                style={{ color: intensity > 0.5 ? "#dbeafe" : "#64748b" }}
              >
                ticket{count !== 1 ? "s" : ""}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
