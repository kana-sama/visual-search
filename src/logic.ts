import { spawn, Thread, Worker } from "threads";

import winkNLP from "wink-nlp";
import model from "wink-eng-lite-web-model";

import { mean } from "mathjs";
import { UMAP } from "umap-js";
import { agnes } from "ml-hclust";

import { getIdsPerCluster } from "./cluster-utils";

import type { Article } from "./article-sources";
import * as semanticScholar from "./article-sources/semantic-scholar";
import * as pubMed from "./article-sources/pub-med";

import type { KeywordWorker } from "./keyword-worker";

import { type BaseLLM } from "langchain/llms/base";
import { OpenAI } from "langchain/llms/openai";
import { Progress } from "./progress";
import { SearchRequest } from "./components/search-bar";

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

function traverseP<T, G>(xs: T[], f: (x: T) => Promise<G>): Promise<G[]> {
  return Promise.all(xs.map(f));
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

async function fetchWord2Vec(): Promise<Record<string, number[]>> {
  const response = await fetch(new URL("./w2v.json", import.meta.url));
  return await response.json();
}

function embedArticle(tokens: string[], w2v: Record<string, number[]>): number[] {
  // get the average of all word vectors for tokens that are present in w2v
  let vecs: number[][] = tokens.map(t => w2v[t]).filter(Array.isArray);

  if (vecs.length === 0) {
    return Object.values(w2v)[0].map(_ => 0);
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

export type SearchResponse = ReturnType<typeof doSearchRequest> extends Promise<infer T> ? T : never;

export async function doSearchRequest(req: SearchRequest, progress: Progress) {
  async function fetchW2V() {
    const step = progress.step("Downloading w2v.json");
    const data = await fetchWord2Vec();
    step.complete();
    return data;
  }

  async function fetchArticles() {
    const step = progress.step("Fetching articles");
    const data = await getArticlesSource(req.articlesSource)(
      req.query,
      req.articlesCount,
      req.articlesExcludeEmpty,
      step
    );
    step.complete();
    return data;
  }

  const [w2v, articles] = await Promise.all([fetchW2V(), fetchArticles()]);

  const step_analyze = progress.step("Analyzing articles");

  const tokens: string[][] = articles
    .map(article => nlp.readDoc(article.title + " " + article.abstract))
    .map(article =>
      article
        .tokens()
        .filter(tok => tok.out(its.type) === "word" && !tok.out(its.stopWordFlag))
        .out(its.normal)
    );

  const embeddings = tokens.map(ts => embedArticle(ts, w2v));

  const umap = new UMAP({ minDist: 0.1, spread: 2, distanceFn: cosine });
  const embeddings2D: [number, number][] = umap.fit(embeddings) as any;

  const tree = agnes(embeddings2D, { method: "ward" });

  step_analyze.complete();

  return {
    articles,
    tokens,
    tree,
    umap,
    embeddings,
    embeddings2D,
  };
}

async function generateClusterName(model: BaseLLM, keywords: string[], titles: string[]): Promise<string> {
  return await model.call(`
    We have a set of articles with the following names:
    ${titles
      .slice(0, 10)
      .map(title => " - " + title)
      .join("\n")}

    This group can be distinguished by the following keywords:
    ${keywords.map(keyword => " - " + keyword).join("\n")}

    Generate a short title using maximum of 7 words that would describe that group of articles.
    Do not use common words like "group", "article", "about".
    Do not wrap with quotes. Do not use pattern "A: B".
  `);
}

export type ClusterizeResponse = {
  clusts: number[];
  keywords: string[];
};

export async function clusterize(
  progress: Progress,
  response: SearchResponse,
  clustersAmount: number,
  token: false | string
): Promise<ClusterizeResponse> {
  const step_clusterization = progress.step("Clusterization");
  const worker = new Worker(new URL("./keyword-worker.ts", import.meta.url) as any);
  const keywordWorker = await spawn<KeywordWorker>(worker);
  let { clusts, keywords } = await keywordWorker(response.tree, clustersAmount, response.embeddings2D, response.tokens);
  await Thread.terminate(keywordWorker);
  step_clusterization.complete();

  let resp = { clusts, keywords };

  if (token) {
    try {
      resp = await prettifyClusters(progress, token, response, resp);
      console.log(resp);
    } catch (err) {
      console.error(err);
    }
  }

  return resp;
}

export async function prettifyClusters(
  progress: Progress,
  openAIToken: string,
  search: SearchResponse,
  resp: ClusterizeResponse
): Promise<ClusterizeResponse> {
  const step_prettify = progress.step("Resolve clusters names using ChatGPT");

  const byClasters: { keyword: string; articles: Article[] }[] = resp.keywords.map(keyword => ({
    keyword,
    articles: [],
  }));
  resp.clusts.forEach((c, i) => {
    byClasters[c].articles.push(search.articles[i]);
  });

  const model = new OpenAI({
    openAIApiKey: openAIToken,
    temperature: 0.9,
  });

  const keywords = await traverseP(byClasters, cluster =>
    generateClusterName(
      model,
      cluster.keyword.split(","),
      cluster.articles.map(article => article.title)
    )
  );

  step_prettify.complete();

  console.log(keywords);

  return { clusts: resp.clusts, keywords };
}

export function preparePlotData(articles: Article[], embedding: number[][], keywords: string[]): PointData[] {
  let minYear = Math.min(...articles.map(d => d.year));
  return articles.map((article, i) => {
    return {
      ...article,
      x: parseFloat(embedding[i][0].toFixed(2)),
      y: parseFloat(embedding[i][1].toFixed(2)),
      logCit: Math.log10(article.citationCount),
      opacity: (article.year - minYear) / (2022 - minYear),
      rank: i,
      cluster: keywords[i],
    };
  });
}

export function prepareClusterData(clusts: number[], keywords: string[], plotData: PointData[]): ClusterData[] {
  return getIdsPerCluster(clusts).map((ids, ci) => {
    return {
      x: mean(ids.map(i => plotData[i].x)),
      y: mean(ids.map(i => plotData[i].y)),
      cluster: keywords[ci],
    };
  });
}
