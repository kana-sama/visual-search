import { ArticlesSource, Article, withPagination } from ".";

const FIELDS = ["title", "abstract", "year", "citationCount", "url"];

const LIMIT = 100;
const URL = "https://api.semanticscholar.org/graph/v1/paper/search";

async function request(
  query: string,
  limit: number,
  offset: number
): Promise<Article[]> {
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("limit", limit.toString());
  params.set("offset", offset.toString());
  params.set("fields", FIELDS.join(","));

  const response = await fetch(`${URL}?${params}`);
  const data = await response.json();
  return data.data ?? [];
}

export const getArticles: ArticlesSource = withPagination(request, LIMIT);
