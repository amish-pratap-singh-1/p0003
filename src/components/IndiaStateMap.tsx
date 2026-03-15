import { useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts/highmaps";
import { STATE_NAME_TO_ID } from "@/data/india";
import { useRouter } from "next/router";

interface Props {
  data: { st_name: string; value: number }[];
}
export default function IndiaStateMap({ data }: Props) {
  const [mapData, setMapData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/maps/india_states.json")
      .then((res) => res.json())
      .then((json) => setMapData(json));
  }, []);

  if (!mapData) return <div>Loading...</div>;

  const options: Highcharts.Options = {
    chart: {
      map: mapData,
      height: 1000,
    },

    title: {
      text: "India State Heatmap",
    },
    tooltip: {
      headerFormat: "",
      pointFormat: "<b>{point.st_name}</b><br/>Tickets: {point.value}",
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
        joinBy: "st_name",
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
          format: "{point.st_name}",
        },
      },
    ],
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
