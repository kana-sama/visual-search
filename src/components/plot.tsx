import { useMemo, useEffect, useRef, useState } from "react";
import embed from "vega-embed";
import { SearchResponse, prepareClusterData, preparePlotData } from "../logic";
import { ClusterizeRequest } from "./search-bar";
import { type Article } from "../article-sources";
import styled from "styled-components";

export type PointData = {
  x: number;
  y: number;

  title: string;
  logCit: number;
  rank: number;
  cluster: string;
  opacity: number;
  citationCount: number;
  year: number;
};

export type ClusterData = {
  x: number;
  y: number;
  cluster: string;
};

function mkSchema(pointData: PointData[], clusterData: ClusterData[]) {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    datasets: {
      "point-data": pointData,
      "text-data": clusterData,
    },
    layer: [
      {
        data: { name: "point-data" },
        mark: { type: "circle" },
        encoding: {
          x: {
            field: "x",
            type: "quantitative",
            scale: { zero: false },
          },
          y: {
            field: "y",
            type: "quantitative",
            scale: { zero: false },
          },
          size: { field: "logCit", type: "quantitative" },
          //   "color": {"field": "rank", "type": "quantitative", "scale": {"scheme": "goldred", "reverse": true}},
          color: { field: "cluster" },
          opacity: { field: "opacity", legend: null },
          tooltip: [
            { field: "title" },
            { field: "citationCount" },
            { field: "year" },
            { field: "cluster" },
            { field: "rank" },
          ],
          //   "shape": {"field": "Species", "type": "nominal"}
        },
      },
      {
        data: { name: "text-data" },
        mark: { type: "text" },
        encoding: {
          x: {
            field: "x",
            type: "quantitative",
            scale: { zero: false },
          },
          y: {
            field: "y",
            type: "quantitative",
            scale: { zero: false },
          },
          text: { field: "cluster" },
        },
      },
    ],
    width: 500,
    height: 500,
  };
}

// export function preparePlotData(articles: Article[], embedding: number[][], clusters: string[]): PointData[] {
// export function prepareClusterData(clusts: number[], keywords: string[], plotData: PointData[]): ClusterData[] {

type Props = {
  clusts: number[];
  keywords: string[];
  searchResponse: SearchResponse;
  clustersRequest: ClusterizeRequest;
};

export function Plot({ clusts, keywords, searchResponse, clustersRequest }: Props) {
  const { points, clusters } = useMemo(() => {
    const points = preparePlotData(
      searchResponse.articles,
      searchResponse.embeddings2D,
      clusts.map(cl => keywords[cl])
    );

    const clusters = prepareClusterData(clusts, keywords, points);

    return { points, clusters };
  }, [searchResponse, clustersRequest]);

  return <InnerPlot points={points} clusters={clusters} />;
}

type InnerProps = {
  points: PointData[];
  clusters: ClusterData[];
};

function InnerPlot({ points, clusters }: InnerProps) {
  const schema = useMemo(() => mkSchema(points, clusters), [points, clusters]);
  const element = useRef<HTMLDivElement>(null);
  const [selectedItem, setSelectedItem] = useState<null | Article>(null);

  useEffect(() => {
    if (element.current === null) return;
    embed(element.current, schema).then(result => {
      result.view.addEventListener("click", function (_, item) {
        if (item === null || item === undefined || item.datum === undefined) return;
        if (!("title" in item.datum)) return;
        setSelectedItem(item.datum);
      });
    });
  }, [element, schema]);

  return (
    <PlotWrapper>
      <PlotPlot ref={element} />
      {selectedItem && (
        <PlotPreview>
          <h2 className="title">
            <a href={selectedItem.url} target="_blank">
              {selectedItem.title}
            </a>
          </h2>
          <br />
          {selectedItem.abstract}
        </PlotPreview>
      )}
    </PlotWrapper>
  );
}

const PlotWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 10px;
`;
const PlotPlot = styled.div``;
const PlotPreview = styled.div`
  width: 100%;
`;
