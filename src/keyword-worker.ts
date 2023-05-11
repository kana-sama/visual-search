import { expose } from "threads/worker";
import { extractKeywordsTfIdf, extractAgnesClusters, type ClusterLike } from "./cluster-utils";

export type KeywordWorker = typeof keywordWorker;

function keywordWorker(
  tree: ClusterLike,
  nClusters: number,
  embedding: number[][],
  tokens: string[][]
): { clusts: number[]; keywords: string[] } {
  const clusts = extractAgnesClusters(tree, nClusters, embedding.length);
  const keywords = extractKeywordsTfIdf(tokens, clusts, { nKeywords: 5 });
  return { clusts, keywords };
}

expose(keywordWorker);
