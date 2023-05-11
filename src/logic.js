import embed from "vega-embed";
import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";

import { mean } from "mathjs";
import { UMAP } from "umap-js";
import { agnes } from "ml-hclust";

import { getIdsPerCluster } from "./cluster-utils";

import * as semanticScholar from "./article-sources/semantic-scholar";
import * as pubMed from "./article-sources/pub-med";

const nlp = winkNLP(model, ["pos", "ner", "cer"]);
const its = nlp.its;

function storeObject(eid, obj) {
  sessionStorage.setItem(eid, JSON.stringify(obj));
}

function loadObject(eid) {
  return JSON.parse(sessionStorage.getItem(eid));
}

function plotTextEmbedding(data, clusterData, plotDivId, textDivId) {
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
      result.view.addEventListener("click", function (event, item) {
        if (item === null || item.datum === undefined) return;
        document.getElementById(
          textDivId
        ).innerHTML = `<h2 class="title"><a href=${item.datum.url} target="_blank">${item.datum.title}</a></h2><br>${item.datum.abstract}`;
      });
    })
    .catch(console.error);
}

function preparePlotData(textData, embedding, clusters) {
  let minYear = Math.min(...textData.map((d) => d.year));
  return textData.map((d, i) => {
    return {
      ...d,
      x: embedding[i][0].toFixed(2),
      y: embedding[i][1].toFixed(2),
      logCit: Math.log10(d.citationCount),
      opacity: (d.year - minYear) / (2022 - minYear),
      rank: i,
      cluster: clusters[i],
    };
  });
}

function prepareClusterData(clusts, keywords, plotData) {
  const clusterIds = getIdsPerCluster(clusts);
  const clusterData = clusterIds.map((ids, ci) => {
    return {
      x: mean(ids.map((i) => plotData[i].x)),
      y: mean(ids.map((i) => plotData[i].y)),
      cluster: keywords[ci],
    };
  });

  return clusterData;
}

function plotClusterDataAsync({
  plotDivId,
  textDivId,
  nClusters,
  docInfo,
  tokens,
  embedding,
  tree,
}) {
  let worker = new Worker(new URL("./keyword-worker", import.meta.url));
  worker.onmessage = function (e) {
    if (e.data.type === "update") {
      console.log(e.data.text);
    } else {
      console.log("worker done!");
      const clusts = e.data.clusts;
      const keywords = e.data.keywords;

      const plotData = preparePlotData(
        docInfo,
        embedding,
        clusts.map((cl) => keywords[cl])
      );
      const clusterData = prepareClusterData(clusts, keywords, plotData);
      plotTextEmbedding(plotData, clusterData, plotDivId, textDivId);
    }
  };
  worker.postMessage({
    tokens: tokens,
    nClusters: nClusters,
    embedding: embedding,
    tree: tree,
  });
}

export async function updateNClusters({ plotDivId, textDivId, nClusters }) {
  const embedding = loadObject("umap");
  const tokens = loadObject("tokens");
  const docInfo = loadObject("docInfo");
  const tree = loadObject("hclust");

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

function cosine(x, y) {
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

function embedSentence(tokens, w2v) {
  // get the average of all word vectors for tokens that are present in w2v
  let vecs = tokens.map((t) => w2v[t]).filter((v) => v !== undefined);
  if (vecs.length === 0) {
    return Array(Object.values(w2v)[0].length).fill(0.0);
  }
  return mean(vecs, 0);
}

function getArticlesSource(source) {
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
  query,
  { plotDivId, textDivId, nResults = 100, nClusters = 10, excludeEmpty, source } = {}
) {
  console.log("Query: " + query);
  let w2vReq = fetchWord2Vec();
  let docReq = getArticlesSource(source)(query, nResults, excludeEmpty);
  return docReq.then((di) => {
    const docInfo = di.map((d) => {
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
