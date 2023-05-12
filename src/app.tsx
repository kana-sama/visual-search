import { useState, useEffect } from "react";
import "bulma/css/bulma.css";

import { analyseTexts, updateNClusters } from "./logic";
import { useStateStored, isNumber, isString, isBoolean } from "./hooks/use-state-stored";

type SearchRequest = {
  query: string;
  articlesCount: number;
  articlesSource: string;
  articlesExcludeEmpty: boolean;
};

function SearchBar(props: { onSearch(req: SearchRequest): void }) {
  const [query, setQuery] = useState("");

  const [articlesCount, setArticlesCount] = useStateStored("articles-count", 100, isNumber);
  const [articlesSource, setArticlesSource] = useStateStored("articles-source", "semantic-scholar", isString);
  const [articlesExcludeEmpty, setArticlesExcludeEmpty] = useStateStored("exclude-empty", false, isBoolean);
  // const [openAIToken, setOpenAIToken] = useStateStored("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    props.onSearch({
      query,
      articlesCount,
      articlesSource,
      articlesExcludeEmpty,
    });
  }

  return (
    <header>
      <div className="container">
        <form className="content" onSubmit={handleSubmit}>
          <h1>Search</h1>
          <div className="columns">
            <input
              className="column input is-7"
              placeholder="Search query"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="#results"
              value={articlesCount}
              onChange={(event) => setArticlesCount(parseInt(event.currentTarget.value))}
            />
            <div className="select">
              <select value={articlesSource} onChange={(event) => setArticlesSource(event.currentTarget.value)}>
                <option value="semantic-scholar">Semantic Scholar</option>
                <option value="pub-med">PubMed</option>
              </select>
            </div>
            <button className="button" type="submit">
              Search
            </button>
          </div>
          <div className="is-fullwidth">
            <div className="control">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={articlesExcludeEmpty}
                  onChange={(event) => setArticlesExcludeEmpty(event.currentTarget.checked)}
                />
                Exclude empty articles
              </label>
            </div>
          </div>
        </form>
      </div>
    </header>
  );
}

export function App() {
  const [clustersCount, setClustersCount] = useState(10);
  const [searched, setSearched] = useState(false);

  async function handleSearch(request: SearchRequest) {
    await analyseTexts(request.query, {
      plotDivId: "out-plot",
      textDivId: "out-text",
      nClusters: clustersCount,
      nResults: request.articlesCount,
      excludeEmpty: request.articlesExcludeEmpty,
      source: request.articlesSource,
    });

    setSearched(true);
  }

  useEffect(() => {
    if (!searched) return;

    updateNClusters({
      plotDivId: "out-plot",
      textDivId: "out-text",
      nClusters: clustersCount,
    });
  }, [searched, clustersCount]);

  return (
    <>
      <SearchBar onSearch={handleSearch} />

      <div className="control">
        <label className="label">
          Clusters
          <input
            type="range"
            min="2"
            max="50"
            className="slider is-fullwidth"
            disabled={!searched}
            value={clustersCount}
            onChange={(event) => setClustersCount(parseInt(event.currentTarget.value))}
          />
          {clustersCount}
        </label>
      </div>
      <main>
        <div className="container">
          <div className="columns">
            <div id="out-plot" className="column is-8"></div>
            <div id="out-text" className="column"></div>
          </div>
        </div>
      </main>
    </>
  );
}
