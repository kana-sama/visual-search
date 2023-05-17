import { useState, useCallback } from "react";
import styled from "styled-components";
import "bulma/css/bulma.css";

import type { SearchResponse, ClusterizeResponse } from "./logic";
import { doSearchRequest, clusterize } from "./logic";

import { SearchBar, ClusteringParams, type SearchRequest, type ClusterizeRequest } from "./components/search-bar";

import { ProgressView, useProgress } from "./progress";
import { Plot } from "./components/plot";
import { useEffectAsync } from "./hooks/use-effect-async";
import { Clusters } from "./components/clusters";

type State =
  | { tag: "not_searched" }
  | { tag: "searching" }
  | { tag: "ready_for_clustering"; search: SearchResponse; clustsParams: ClusterizeRequest }
  | { tag: "clustering"; search: SearchResponse; clustsParams: ClusterizeRequest }
  | { tag: "clustered"; search: SearchResponse; clustsParams: ClusterizeRequest; clusts: ClusterizeResponse };

type Handlers<T> = { [s in State["tag"]]: (args: State & { tag: s }) => T };

function match<T>(state: State, handlers: Handlers<T>): T {
  return handlers[state.tag](state as any);
}

function match_<T>(state: State, def: T, handlers: Partial<Handlers<T>>): T {
  return handlers[state.tag]?.(state as any) ?? def;
}

export function App() {
  const progress = useProgress();
  const [state, setState] = useState<State>({ tag: "not_searched" });
  const [clustsParams, setClustsParams] = useState<ClusterizeRequest>();
  const isDirty = match_(state, true, { not_searched: () => false });
  const isSearching = match_(state, false, { searching: () => true });

  const handleSearch = useCallback(
    async (request: SearchRequest) => {
      if (!clustsParams) return;

      progress.reset();
      setState({ tag: "searching" });
      setState({ tag: "ready_for_clustering", search: await doSearchRequest(request, progress), clustsParams });
    },
    [clustsParams]
  );

  useEffectAsync(async () => {
    if (!clustsParams) return;
    if (state.tag !== "ready_for_clustering") return;

    progress.reset();

    setState({ tag: "clustering", search: state.search, clustsParams });
    setState({
      tag: "clustered",
      search: state.search,
      clusts: await clusterize(
        progress,
        state.search,
        clustsParams.clustersCount,
        clustsParams.prettyfyKeywords ? clustsParams.openAIToken : false
      ),
      clustsParams: clustsParams,
    });
  }, [state, clustsParams]);

  const handleClusterize = useCallback(
    (clustsParams: ClusterizeRequest) => {
      setClustsParams(clustsParams);
      setState(state =>
        match<State>(state, {
          not_searched: self => self,
          searching: self => self,
          ready_for_clustering: self => ({ ...self, clustsParams }),
          clustering: self => ({ ...self, tag: "ready_for_clustering", clustsParams }),
          clustered: self => ({ ...self, tag: "ready_for_clustering", clustsParams }),
        })
      );
    },
    [clustsParams]
  );

  return (
    <AppContainer dirty={isDirty}>
      <AppHeader dirty={isDirty}>Visual Search</AppHeader>
      <SearchBar disabled={isSearching} onSearch={handleSearch} />
      <ClusteringParams onChange={handleClusterize} />

      <AppBody>
        {match(state, {
          not_searched() {
            return <></>;
          },
          searching() {
            return <ProgressView progress={progress} />;
          },
          ready_for_clustering() {
            return <ProgressView progress={progress} />;
          },
          clustering() {
            return <ProgressView progress={progress} />;
          },
          clustered({ clusts, search, clustsParams }) {
            return (
              <>
                <Plot
                  clusts={clusts.clusts}
                  keywords={clusts.keywords}
                  searchResponse={search}
                  clustersRequest={clustsParams}
                />
                {clusts.prettified && (
                  <div style={{ marginTop: "20px" }}>
                    <Clusters clusters={clusts.prettified} />
                  </div>
                )}
              </>
            );
          },
        })}
      </AppBody>
    </AppContainer>
  );
}

const AppContainer = styled.div<{ dirty: boolean }>`
  padding: 0 20px 0;
  max-width: 1280px;
  margin: 0 auto;

  padding-top: ${props => (props.dirty ? "0" : "200px")};
  transition: padding-top 300ms ease-out;
`;

const AppHeader = styled.h1<{ dirty: boolean }>`
  font-size: ${props => (props.dirty ? "2em" : "4em")};
  transition: font-size 300ms ease-out;
`;

const AppBody = styled.div`
  margin-top: 30px;
`;
