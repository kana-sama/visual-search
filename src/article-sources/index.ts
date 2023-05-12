import { ProgressStep } from "../progress";

export interface Article {
  title: string;
  abstract?: string;
  year: number;
  citationCount: number;
  url: string;
}

function isEmptyArticle(article: Article): boolean {
  if (!article.abstract) return true;
  if (typeof article.abstract !== "string") return true;
  if (article.abstract.trim().length === 0) return true;
  return false;
}

export type ArticlesSource = (
  query: string,
  amount: number,
  excludeEmpty: boolean,
  step?: ProgressStep
) => Promise<Article[]>;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function withPagination(
  request: (query: string, limit: number, offset: number) => Promise<Article[]>,
  limit: number
): ArticlesSource {
  return async (query, amount, excludeEmpty, progress) => {
    let offset = 0;
    let result: Article[] = [];

    while (offset < amount) {
      let chunkSize = Math.min(amount - offset, limit);

      if (chunkSize * 2 < limit) {
        chunkSize *= 2;
      }

      let chunk = await request(query, limit, offset);

      if (excludeEmpty) chunk = chunk.filter(article => !isEmptyArticle(article));

      if (chunk.length === 0) break;

      chunk.splice(amount - offset);
      offset += chunk.length;
      result.push(...chunk);

      progress?.setMessage(`Fetching articles: ${offset}/${amount}`);

      if (amount - offset === 0) break;

      await sleep(500);
    }

    return result;
  };
}
