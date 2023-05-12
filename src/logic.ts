import { spawn, Thread, Worker } from "threads";

import type { Item } from "vega";
import embed from "vega-embed";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";

import { mean } from "mathjs";
import { UMAP } from "umap-js";
import { agnes, type Cluster } from "ml-hclust";

import { getIdsPerCluster } from "./cluster-utils";

import type { Article } from "./article-sources";
import * as semanticScholar from "./article-sources/semantic-scholar";
import * as pubMed from "./article-sources/pub-med";

import type { KeywordWorker } from "./keyword-worker";

import { OpenAI } from "langchain/llms/openai";

type ArticleWithText = Article & { text: string };

type PointData = Article & {
  x: number;
  y: number;

  opacity: number;
  logCit: number;
  rank: number;
  cluster: string;
};

type ClusterData = {
  x: number;
  y: number;
  cluster: string;
};

const nlp = winkNLP(model, ["pos", "ner", "cer"]);
const its = nlp.its;

function storeObject(eid: string, obj: unknown) {
  sessionStorage.setItem(eid, JSON.stringify(obj));
}

function loadObject(eid: string): unknown {
  return JSON.parse(sessionStorage.getItem(eid) ?? "{}");
}

function plotTextEmbedding(data: PointData[], clusterData: ClusterData[], plotDivId: string, textDivId: string) {
  let schema = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    datasets: {
      "point-data": data,
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

  //   console.log(schema)
  embed(`#${plotDivId}`, schema)
    .then(function (result) {
      result.view.addEventListener("click", (event, item?: null | Item<Article>) => {
        if (item === null || item === undefined || item.datum === undefined) return;
        const $text = document.getElementById(textDivId);

        if ($text)
          $text.innerHTML = `
            <h2 class="title">
              <a href=${item.datum.url} target="_blank">
                ${item.datum.title}
              </a>
            </h2>
            <br />
            ${item.datum.abstract}
          `;
      });
    })
    .catch(console.error);
}

function preparePlotData(textData: ArticleWithText[], embedding: number[][], clusters: string[]): PointData[] {
  let minYear = Math.min(...textData.map((d) => d.year));
  return textData.map((d, i) => {
    return {
      ...d,
      x: parseFloat(embedding[i][0].toFixed(2)),
      y: parseFloat(embedding[i][1].toFixed(2)),
      logCit: Math.log10(d.citationCount),
      opacity: (d.year - minYear) / (2022 - minYear),
      rank: i,
      cluster: clusters[i],
    };
  });
}

function prepareClusterData(clusts: number[], keywords: string[], plotData: PointData[]): ClusterData[] {
  return getIdsPerCluster(clusts).map((ids, ci) => {
    return {
      x: mean(ids.map((i) => plotData[i].x)) as number,
      y: mean(ids.map((i) => plotData[i].y)) as number,
      cluster: keywords[ci],
    };
  });
}

async function plotClusterDataAsync({
  plotDivId,
  textDivId,
  nClusters,
  docInfo,
  tokens,
  embedding,
  tree,
}: {
  plotDivId: string;
  textDivId: string;
  nClusters: number;
  docInfo: ArticleWithText[];
  tokens: string[][];
  embedding: number[][];
  tree: Cluster;
}) {
  const worker = new Worker(new URL("./keyword-worker.ts", import.meta.url) as any);
  const keywordWorker = await spawn<KeywordWorker>(worker);
  const { clusts, keywords } = await keywordWorker(tree, nClusters, embedding, tokens);
  await Thread.terminate(keywordWorker);

  const byClasters: { keyword: string; articles: Article[] }[] = keywords.map((keyword) => ({
    keyword,
    articles: [],
  }));
  clusts.forEach((c, i) => {
    byClasters[c].articles.push(docInfo[i]);
  });

  const model = new OpenAI({
    openAIApiKey: "",
    temperature: 0.9,
  });

  await Promise.all(
    byClasters.map(async (cluster, i) => {
      keywords[i] = await model.call(`
        We have a set of articles with the following names:
        ${cluster.articles.map((article) => " - " + article.title).join("\n")}

        This group can be distinguished by the following keywords: ${cluster.keyword}.

        Generate a single short sentence in maximum of ten words that would describe this group of articles.
        Do not use words such as "group", "articles", "about".
      `);
    })
  );

  const plotData = preparePlotData(
    docInfo,
    embedding,
    clusts.map((cl) => keywords[cl])
  );

  const clusterData = prepareClusterData(clusts, keywords, plotData);
  plotTextEmbedding(plotData, clusterData, plotDivId, textDivId);
}

export async function updateNClusters({ plotDivId, textDivId, nClusters }: any) {
  const embedding: number[][] = loadObject("umap") as any;
  const tokens: string[][] = loadObject("tokens") as any;
  const docInfo: ArticleWithText[] = loadObject("docInfo") as any;
  const tree: Cluster = loadObject("hclust") as any;

  plotClusterDataAsync({
    plotDivId: plotDivId,
    textDivId: textDivId,
    nClusters: nClusters,
    docInfo: docInfo,
    tokens: tokens,
    embedding: embedding,
    tree: tree,
  });
}

function cosine(x: number[], y: number[]): number {
  let result = 0.0;
  let normX = 0.0;
  let normY = 0.0;

  for (let i = 0; i < x.length; i++) {
    result += x[i] * y[i];
    normX += x[i] ** 2;
    normY += y[i] ** 2;
  }

  if (normX === 0 && normY === 0) {
    return 0;
  } else if (normX === 0 || normY === 0) {
    return 1.0;
  } else {
    return 1.0 - result / Math.sqrt(normX * normY);
  }
}

async function fetchWord2Vec() {
  const response = await fetch(new URL("./w2v.json", import.meta.url));
  return await response.json();
}

function embedSentence(tokens: string[], w2v: Record<string, number[]>) {
  // get the average of all word vectors for tokens that are present in w2v
  let vecs = tokens.map((t) => w2v[t]).filter((v) => v !== undefined);
  if (vecs.length === 0) {
    return Array(Object.values(w2v)[0].length).fill(0.0);
  }
  return mean(vecs, 0);
}

function getArticlesSource(source: string) {
  switch (source) {
    case "semantic-scholar":
      return semanticScholar.getArticles;
    case "pub-med":
      return pubMed.getArticles;
    default:
      throw new Error(`Unknown source ${source}`);
  }
}

export async function analyseTexts(
  query: string,
  { plotDivId, textDivId, nResults = 100, nClusters = 10, excludeEmpty, source }: any = {}
) {
  console.log("Query: " + query);
  let w2vReq = fetchWord2Vec();
  let docReq = getArticlesSource(source)(query, nResults, excludeEmpty);
  return docReq.then((di) => {
    const docInfo: ArticleWithText[] = di.map((d) => {
      return { ...d, text: d.title + " " + d.abstract };
    });
    const docs = docInfo.map((d) => nlp.readDoc(d.text));
    const tokens = docs.map((d) => {
      return d
        .tokens()
        .filter((t) => t.out(its.type) === "word" && !t.out(its.stopWordFlag))
        .out(its.normal); // its.lemma
    });

    storeObject("tokens", tokens);
    storeObject("docInfo", docInfo);
    return w2vReq.then((w2v) => {
      const sentVecs = tokens.map((ts) => embedSentence(ts, w2v));

      const umap = new UMAP({ minDist: 0.1, spread: 2, distanceFn: cosine });
      const embedding = umap.fit(sentVecs);

      storeObject("umap", embedding);
      const tree = agnes(embedding, { method: "ward" });
      storeObject("hclust", tree);

      plotClusterDataAsync({
        plotDivId: plotDivId,
        textDivId: textDivId,
        nClusters: nClusters,
        docInfo: docInfo,
        tokens: tokens,
        embedding: embedding,
        tree: tree,
      });
    });
  });
}
