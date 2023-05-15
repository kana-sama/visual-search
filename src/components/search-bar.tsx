import styled from "styled-components";
import { useState, useMemo, useEffect } from "react";
import debounce from "lodash/debounce";

import { useStateStored, isStringNumber, isString, isBoolean } from "../hooks/use-state-stored";
import { SecureInput } from "./secure-input";

export type SearchRequest = {
  query: string;
  articlesCount: number;
  articlesSource: string;
  articlesExcludeEmpty: boolean;
};

export type ClusterizeRequest = {
  clustersCount: number;
  prettyfyKeywords: boolean;
  openAIToken: string;
};

function validateSearchParams(values: {
  query: string;

  articlesCount: string;
  articlesSource: string;
  articlesExcludeEmpty: boolean;
}): SearchRequest | null {
  const query = values.query.trim();

  const articlesCount = parseInt(values.articlesCount, 10);
  const articlesSource = values.articlesSource;
  const articlesExcludeEmpty = values.articlesExcludeEmpty;

  if (query.length === 0) return null;
  if (isNaN(articlesCount)) return null;

  return {
    query,
    articlesCount,
    articlesSource,
    articlesExcludeEmpty,
  };
}

function validateClusteringParams(values: {
  clustersCount: string;
  prettyfyKeywords: boolean;
  openAIToken: string;
}): ClusterizeRequest | null {
  const clustersCount = parseInt(values.clustersCount, 10);
  const prettyfyKeywords = values.prettyfyKeywords;
  const openAIToken = values.openAIToken;

  if (isNaN(clustersCount)) return null;

  return {
    clustersCount,
    prettyfyKeywords,
    openAIToken,
  };
}

export type Props = {
  disabled: boolean;
  onSearch(req: SearchRequest): void;
};

export function SearchBar({ disabled, onSearch }: Props) {
  const [query, setQuery] = useState("");
  const [articlesCount, setArticlesCount] = useStateStored("articles-count", "100", isStringNumber);
  const [articlesSource, setArticlesSource] = useStateStored("articles-source", "semantic-scholar", isString);
  const [articlesExcludeEmpty, setArticlesExcludeEmpty] = useStateStored("exclude-empty", false, isBoolean);

  const searchRequest = useMemo(
    () => validateSearchParams({ query, articlesCount, articlesSource, articlesExcludeEmpty }),
    [query, articlesCount, articlesSource, articlesExcludeEmpty]
  );

  const canSubmit = !disabled && searchRequest !== null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (canSubmit) onSearch(searchRequest);
  }

  return (
    <SearchForm disabled={disabled ?? false} onSubmit={handleSubmit}>
      <SearchLine>
        <SearchInput type="search" onChange={e => setQuery(e.currentTarget.value)} />
        <SearchButton type="submit" disabled={!canSubmit}>
          🔍
        </SearchButton>
      </SearchLine>

      <SearchParams>
        <SearchParam>
          <SearchParamLabel htmlFor="articles-count">Articles</SearchParamLabel>
          <input
            type="number"
            className="input"
            id="articles-count"
            value={articlesCount}
            onChange={e => setArticlesCount(e.currentTarget.value)}
          />
        </SearchParam>

        <SearchParam>
          <SearchParamLabel htmlFor="articles-source">Source</SearchParamLabel>
          <div className="select">
            <select
              value={articlesSource}
              id="articles-source"
              onChange={event => setArticlesSource(event.currentTarget.value)}
            >
              <option value="semantic-scholar">Semantic Scholar</option>
              <option value="pub-med">PubMed</option>
            </select>
          </div>
        </SearchParam>

        <SearchParam>
          <SearchParamLabel htmlFor="exclude-empty">Exclude empty articles</SearchParamLabel>
          <input
            id="exclude-empty"
            type="checkbox"
            checked={articlesExcludeEmpty}
            onChange={event => setArticlesExcludeEmpty(event.currentTarget.checked)}
          />
        </SearchParam>
      </SearchParams>
    </SearchForm>
  );
}

export function ClusteringParams({ onChange }: { onChange(params: ClusterizeRequest): void }) {
  const [clustersCount, setClustersCount] = useStateStored("clusters-count", "10", isStringNumber);
  const [prettyfyKeywords, setPrettyfyKeywords] = useStateStored("pretty-kws", false, isBoolean);
  const [openAIToken, setOpenAIToken] = useStateStored("open-ai-token", "", isString);

  const onChange_ = useMemo(() => debounce(onChange, 500), [onChange]);

  const clusterizeRequest = useMemo(
    () => validateClusteringParams({ clustersCount, prettyfyKeywords, openAIToken }),
    [clustersCount, prettyfyKeywords, openAIToken]
  );

  useEffect(() => {
    if (clusterizeRequest) onChange_(clusterizeRequest);
  }, [clusterizeRequest]);

  return (
    <SearchParams>
      <SearchParam>
        <SearchParamLabel htmlFor="clusters-count">Clusters</SearchParamLabel>
        <input
          type="number"
          className="input"
          id="clusters-count"
          value={clustersCount}
          onChange={e => setClustersCount(e.currentTarget.value)}
        />
      </SearchParam>

      <SearchParam>
        <SearchParamLabel htmlFor="openai-tokeb">OpenAI token</SearchParamLabel>
        <SecureInput
          className="input"
          id="openai-tokeb"
          value={openAIToken}
          onChange={e => setOpenAIToken(e.currentTarget.value)}
        />
      </SearchParam>

      <SearchParam>
        <SearchParamLabel htmlFor="prettify-kws">Use ChatGPT</SearchParamLabel>
        <input
          id="prettify-kws"
          type="checkbox"
          checked={prettyfyKeywords}
          onChange={event => setPrettyfyKeywords(event.currentTarget.checked)}
        />
      </SearchParam>
    </SearchParams>
  );
}

const SearchForm = styled.form<{ disabled: boolean }>`
  user-select: none;
  opacity: ${props => (props.disabled ? 0.5 : 1)};
`;

const SearchLine = styled.div`
  display: flex;
  flex-direction: row;
  margin-bottom: 16px;

  border: 1px solid #ccc;
  border-radius: 20px;
  background: #fff;
  overflow: hidden;
`;

const SearchButton = styled.button`
  font-size: 24px;
  background-color: #fff;
  border: 0;
  padding: 4px 16px;
  font-weight: 100;

  cursor: ${props => (props.disabled ? "not-allowed" : "pointer")};
  opacity: ${props => (props.disabled ? 0.5 : 1)};
`;

const SearchInput = styled.input`
  padding: 8px 16px;

  border: 0;
  background: transparent;
  width: 100%;
  font-size: 16px;

  &:focus {
    outline: none;
    box-shadow: 0;
  }
`;

const SearchParams = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: right;
  gap: 24px;
`;

const SearchParam = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const SearchParamLabel = styled.label`
  color: #555;
  margin-right: 8px;
`;
