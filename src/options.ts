const validArticleSources = ["semantic-scholar", "pub-med"] as const;

export type ArticleSource = (typeof validArticleSources)[number];

export interface Options {
  amountOfClusters: number;
  amountOfArticles: number;
  excludeEmptyArticles: boolean;
  articlesSource: ArticleSource;
}

const defaultOptions: Options = {
  amountOfClusters: 10,
  amountOfArticles: 100,
  excludeEmptyArticles: true,
  articlesSource: "semantic-scholar",
};

export function save(options: Options) {
  localStorage.setItem("options", JSON.stringify(options));
}

export function load(): Options {
  const value = JSON.parse(localStorage.getItem("options") ?? "{}");
  return parseOptions(value) ?? defaultOptions;
}

function enumMember<T extends readonly unknown[]>(value: unknown, valid: T): value is T[number] {
  return valid.includes(value);
}

function parseOptions(value: unknown): Options | null {
  if (typeof value !== "object") return null;
  if (value === null) return null;

  if (!("amountOfClusters" in value)) return null;
  const amountOfClusters: unknown = value["amountOfClusters"];
  if (typeof amountOfClusters !== "number") return null;

  if (!("amountOfArticles" in value)) return null;
  const amountOfArticles: unknown = value["amountOfArticles"];
  if (typeof amountOfArticles !== "number") return null;

  if (!("excludeEmptyArticles" in value)) return null;
  const excludeEmptyArticles: unknown = value["excludeEmptyArticles"];
  if (typeof excludeEmptyArticles !== "boolean") return null;

  if (!("articlesSource" in value)) return null;
  const articlesSource: unknown = value["articlesSource"];
  if (!enumMember(articlesSource, validArticleSources)) return null;

  return {
    amountOfClusters,
    amountOfArticles,
    excludeEmptyArticles,
    articlesSource,
  };
}
