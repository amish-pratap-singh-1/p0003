import { useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts/highmaps";

interface Props {
  data: { pc_name: string; value: number }[];
  stateName: string;
  selectedConstituency?: string;
  onSelect?: (constituency: string) => void;
}

export default function IndiaConstMap({
  data,
  stateName,
  selectedConstituency,
  onSelect,
}: Props) {
  const [mapData, setMapData] = useState<any>(null);

  useEffect(() => {
    fetch("/maps/india.json")
      .then((res) => res.json())
      .then((json) => {
        const filteredFeatures = json.features.filter(
          (f: any) => f.properties.st_name === stateName,
        );
        setMapData({ ...json, features: filteredFeatures });
      });
  }, [stateName]);

  if (!mapData)
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm animate-pulse">
        Loading map...
      </div>
    );

  const enrichedData = data.map((d) => ({
    ...d,
    selected: d.pc_name === selectedConstituency,
    // Boost color for selected so it stands out
    color: d.pc_name === selectedConstituency ? "#f97316" : undefined,
  }));

  const options: Highcharts.Options = {
    chart: { map: mapData },
    title: { text: "Constituency Heatmap" },
    tooltip: {
      headerFormat: "",
      pointFormat: "<b>{point.pc_name}</b><br/>Tickets: {point.value}",
    },
    colorAxis: {
      min: 0,
      minColor: "#FFF5F5",
      maxColor: "#CC0000",
    },
    series: [
      {
        type: "map",
        name: "Tickets",
        data: enrichedData,
        joinBy: "pc_name",
        point: {
          events: {
            click: function () {
              const point = this as any;
              const name = point.pc_name;
              if (onSelect) onSelect(name);
            },
          },
        },
        cursor: "pointer",
        dataLabels: {
          enabled: true,
          format: "{point.pc_name}",
        },
      },
    ],
    responsive: {
      rules: [
        {
          condition: { maxWidth: 640 },
          chartOptions: {
            series: [
              {
                type: "map",
                dataLabels: { style: { fontSize: "7px" } },
              },
            ],
          },
        },
      ],
    },
  };

  return (
    <HighchartsReact
      highcharts={Highcharts}
      constructorType="mapChart"
      options={options}
    />
  );
}
