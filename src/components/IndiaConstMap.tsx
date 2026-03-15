import { useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts/highmaps";
import { STATE_NAME_TO_ID } from "@/data/india";
import { useRouter } from "next/router";

interface Props {
  data: { pc_name: string; value: number }[];
  stateName: string;
}
export default function IndiaConstMap({ data, stateName }: Props) {
  const [mapData, setMapData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/maps/india.json")
      .then((res) => res.json())
      .then((json) => {
        // Filter the GeoJSON features to only the given state
        const filteredFeatures = json.features.filter(
          (f: any) => f.properties.st_name === stateName,
        );
        setMapData({ ...json, features: filteredFeatures });
      });
  }, [stateName]);

  if (!mapData) return <div>Loading...</div>;
  console.log(mapData);

  const options: Highcharts.Options = {
    chart: {
      map: mapData,
    },

    title: {
      text: "Constituency Heatmap",
    },
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
        data: data,
        joinBy: "pc_name",
        point: {
          events: {
            mouseOver: function () {
              const point = this as any;
              if (point.value > 0) {
                point.graphic?.css({ cursor: "pointer" });
              } else {
                point.graphic?.css({ cursor: "default" });
              }
            },
            click: function () {
              const point = this as any;
              const stateName = point.st_name;
              const stateId = STATE_NAME_TO_ID[stateName];
              if (stateId) router.push(`/state/${stateId}`);
            },
          },
        },

        dataLabels: {
          enabled: true,
          format: "{point.pc_name}",
        },
      },
    ],
    responsive: {
      rules: [
        {
          condition: {
            maxWidth: 640, // mobile
          },
          chartOptions: {
            series: [
              {
                type: "map",
                dataLabels: {
                  style: {
                    fontSize: "7px",
                  },
                },
              },
            ],
          },
        },
      ],
    },
  };

  return (
    <>
      <HighchartsReact
        highcharts={Highcharts}
        constructorType="mapChart"
        options={options}
      />
    </>
  );
}
