import { useState, useMemo, useEffect } from "react";
import "bulma/css/bulma.css";
import debounce from "lodash/debounce";

import { analyseTexts, updateNClusters } from "./logic";
import { useStateStored, isNumber, isString, isBoolean } from "./hooks/use-state-stored";

import { ProgressView, useProgress } from "./progress";

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
              onChange={event => setQuery(event.currentTarget.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="#results"
              value={articlesCount}
              onChange={event => setArticlesCount(parseInt(event.currentTarget.value))}
            />
            <div className="select">
              <select value={articlesSource} onChange={event => setArticlesSource(event.currentTarget.value)}>
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
                  onChange={event => setArticlesExcludeEmpty(event.currentTarget.checked)}
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

const updateNClusters_ = debounce(updateNClusters, 500);

export function App() {
  const progress = useProgress();

  const [clustersCount, setClustersCount] = useStateStored("clusters-count", 10, isNumber);
  const [prettyKeywords, setPrettyKeywords] = useStateStored("pretty-kws", false, isBoolean);
  const [openAIToken, setOpenAIToken] = useStateStored("open-ai-token", "", isString);

  const [searched, setSearched] = useState(false);

  const prettifyKeywords = useMemo(() => prettyKeywords && { token: openAIToken }, [prettyKeywords, openAIToken]);

  async function handleSearch(request: SearchRequest) {
    progress.reset();

    await analyseTexts(request.query, progress, {
      plotDivId: "out-plot",
      textDivId: "out-text",
      nClusters: clustersCount,
      nResults: request.articlesCount,
      excludeEmpty: request.articlesExcludeEmpty,
      source: request.articlesSource,
      prettifyKeywords,
    });

    setSearched(true);
  }

  useEffect(() => {
    if (!searched) return;

    updateNClusters_(progress, {
      plotDivId: "out-plot",
      textDivId: "out-text",
      nClusters: clustersCount,
      prettifyKeywords,
    });
  }, [progress, searched, clustersCount, prettifyKeywords]);

  return (
    <>
      <SearchBar onSearch={handleSearch} />

      <div className="container">
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
              onChange={event => setClustersCount(parseInt(event.currentTarget.value))}
            />
            {clustersCount}
          </label>
        </div>

        <div className="control columns">
          <label className="checkbox column is-4">
            <input
              type="checkbox"
              checked={prettyKeywords}
              onChange={event => setPrettyKeywords(event.currentTarget.checked)}
            />
            Prettify keywords using ChatGPT
          </label>
          <SecureInput
            className="input column is-8"
            style={{ fontFamily: "monospace" }}
            placeholder="OpenAI token"
            value={openAIToken}
            disabled={!prettyKeywords}
            onChange={event => setOpenAIToken(event.currentTarget.value)}
          />
        </div>
      </div>

      <div className="container my-5">
        <ProgressView progress={progress} />
      </div>

      <main className="container" style={{ marginTop: "20px" }}>
        <div className="columns">
          <div id="out-plot" className="column is-8"></div>
          <div id="out-text" className="column"></div>
        </div>
      </main>
    </>
  );
}

function SecureInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [inFocus, setInFocus] = useState(false);
  return (
    <input
      {...props}
      type={inFocus ? "text" : "password"}
      onFocus={() => setInFocus(true)}
      onBlur={() => setInFocus(false)}
    />
  );
}
