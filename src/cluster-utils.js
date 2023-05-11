import { calculateTfIdf } from "ts-tfidf";
import { Cluster } from "ml-hclust";
import { mean } from "mathjs";

export function extractKeywordsTfIdf(tokens, clusters, { nKeywords = 10 } = {}) {
  const corpus = calculateTfIdf({
    texts: tokens.map((t) => t.join(" ")),
    stopWords: ["null"],
  });
  const clusterIds = getIdsPerCluster(clusters);

  // average tfidf for each cluster
  const words = Array.from(corpus[0].keys());
  const clusterTfidf = clusterIds.map((ids) =>
    mean(
      ids.map((i) => Array.from(corpus[i].values())),
      0
    )
  );

  // get the top nKeywords keywords for each cluster
  const clusterKeywords = clusterTfidf.map((ct) => {
    const sorted = ct.map((t, i) => [i, t]).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, nKeywords).map((t) => words[t[0]]);
  });

  // join keywords per cluster
  const keywords = clusterKeywords.map((kw) => kw.join(","));
  console.log(keywords);
  return keywords;
}

export function extractAgnesClusters(tree, nClusters, nObjects) {
  tree = toCluster(tree);
  const groups = tree.group(parseInt(nClusters));
  let clusts = Array(nObjects).fill(-1);
  for (let cli = 0; cli < nClusters; ++cli) {
    let ch = groups.children[cli];
    for (const chi of ch.indices()) {
      clusts[chi] = cli;
    }
  }

  return clusts;
}

export function getIdsPerCluster(clusters) {
  let clusterIds = Array(new Set(clusters).size)
    .fill()
    .map(() => []);
  for (let i = 0; i < clusters.length; ++i) {
    clusterIds[clusters[i]].push(i);
  }
  return clusterIds;
}

function toCluster(tree) {
  const cluster = new Cluster();
  cluster.height = tree.height;
  cluster.size = tree.size;
  cluster.index = tree.index;
  cluster.isLeaf = tree.isLeaf;
  cluster.children = tree.children.map(toCluster);
  return cluster;
}
