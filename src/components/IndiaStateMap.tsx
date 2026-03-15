import { useEffect, useState } from "react";
import HighchartsReact from "highcharts-react-official";
import Highcharts from "highcharts/highmaps";
import indiaMap from "@highcharts/map-collection/countries/in/in-all.geo.json";

interface Props {
  data: { st_name: string; value: number }[];
}
export default function IndiaStateMap({ data }: Props) {
  const [mapData, setMapData] = useState<any>(null);

  useEffect(() => {
    fetch("/maps/india_states.json")
      .then((res) => res.json())
      .then((json) => setMapData(json));
  }, []);
  useEffect(() => {
    fetch("/maps/india_states.json")
      .then((res) => res.json())
      .then((json) => {
        setMapData(json);
        // Log all st_name values from GeoJSON
        const names = json.features.map((f: any) => f.properties.st_name);
        console.log("GeoJSON state names:", names);
      });
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
