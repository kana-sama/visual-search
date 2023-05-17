import styled from "styled-components";

export type Props = {
  clusters: {
    title: string;
    keywords: string[];
    description: string;
  }[];
};

export function Clusters({ clusters }: Props) {
  return (
    <ClustersContainer>
      {clusters.map(cluster => (
        <Cluster key={cluster.title}>
          <ClusterTitle>{cluster.title}</ClusterTitle>
          <ClusterKewords>
            {cluster.keywords.map(keyword => (
              <ClusterKeword key={keyword}>{keyword}</ClusterKeword>
            ))}
          </ClusterKewords>
          <ClusterDescription>{cluster.description}</ClusterDescription>
        </Cluster>
      ))}
    </ClustersContainer>
  );
}

const ClustersContainer = styled.section`
  --gap: 20px;
  --per-row: 1;

  display: flex;
  flex-wrap: wrap;
  gap: var(--gap);

  @media (min-width: 768px) {
    --per-row: 2;
  }

  @media (min-width: 1200px) {
    --per-row: 3;
  }
`;

const Cluster = styled.article`
  width: calc((100% - var(--gap) * (var(--per-row) - 1)) / var(--per-row));
  padding: 20px;

  display: flex;
  flex-direction: column;
  gap: 10px;

  &:hover {
    background-color: #eee;
  }
`;

const ClusterTitle = styled.header`
  font-size: 1.2em;
  font-weight: bold;
`;

const ClusterKewords = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4px;
`;

const ClusterKeword = styled.div`
  color: white;
  background: #444;
  padding: 2px 6px;
`;

const ClusterDescription = styled.p`
  text-align: justify;
`;
