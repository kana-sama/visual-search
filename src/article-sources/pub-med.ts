import { ArticlesSource, Article, withPagination } from ".";

const URL = "https://eutils.ncbi.nlm.nih.gov";
const LIMIT = 250;

type Id = string;

async function searchArticles(
  term: string,
  retmax: number,
  retstart: number
): Promise<Id[]> {
  const searchparams = new URLSearchParams({
    term,
    retmax: retmax.toString(),
    retstart: retstart.toString(),
  });

  const url = `${URL}/entrez/eutils/esearch.fcgi?${searchparams}`;
  const response = await fetch(url);
  const sourceXML = await response.text();

  const parsedXML = new DOMParser().parseFromString(sourceXML, "text/xml");
  const idNodes = Array.from(parsedXML.querySelectorAll("IdList > Id"));
  return idNodes.map((e) => e.innerHTML);
}

async function fetchArticles(ids: Id[]): Promise<Article[]> {
  const searchparams = new URLSearchParams(ids.map((id) => ["id", id]));
  searchparams.set("retmode", "xml");
  searchparams.set("db", "pubmed");

  const url = `${URL}/entrez/eutils/efetch.fcgi?${searchparams}`;
  const response = await fetch(url);
  const sourceXML = await response.text();

  const parsedXML = new DOMParser().parseFromString(sourceXML, "text/xml");

  const articleNodes = Array.from(
    parsedXML.querySelectorAll("PubmedArticle > MedlineCitation")
  );

  return articleNodes.map(parseArticle).filter(isNotNull);
}

function parseArticle(node: Element): Article | null {
  const title = node.querySelector("Article > ArticleTitle")?.innerHTML;

  const abstract = node.querySelector(
    "Article > Abstract > AbstractText"
  )?.innerHTML;

  const year = parseInt(
    node.querySelector("Article > ArticleDate > Year")?.innerHTML ?? "NaN"
  );

  const citationCount = 100;

  const id = node.querySelector("PMID")?.innerHTML;

  const url = `https://pubmed.ncbi.nlm.nih.gov/${id}`;

  if (title && !isNaN(year) && !isNaN(citationCount) && url) {
    return { title, abstract, year, citationCount, url };
  }

  return null;
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

async function request(
  query: string,
  limit: number,
  offset: number
): Promise<Article[]> {
  const ids = await searchArticles(query, limit, offset);
  return await fetchArticles(ids);
}

export const getArticles: ArticlesSource = withPagination(request, LIMIT);
