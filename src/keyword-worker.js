import { extractKeywordsTfIdf, extractAgnesClusters } from "./cluster-utils.js";

onmessage = function (event) {
  const tree = event.data.tree;
  const nClusters = event.data.nClusters;
  const embedding = event.data.embedding;
  const tokens = event.data.tokens;

  postMessage({ text: "Worker started!", type: "update" });
  const clusts = extractAgnesClusters(tree, nClusters, embedding.length);
  postMessage({ text: "Clusters estimated!", type: "update" });
  const keywords = extractKeywordsTfIdf(tokens, clusts, { nKeywords: 5 });
  postMessage({ text: "Keywords extracted!", type: "update" });

  postMessage({ clusts: clusts, keywords: keywords, type: "result" });
};
