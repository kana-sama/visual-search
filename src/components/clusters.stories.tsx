import { Clusters } from "./clusters";

export default { component: Clusters };

function cluster(i: number, short = false) {
  return {
    title: `Lorem ipsum dolor sit amet ${i}`,
    keywords: ["lorem", "ipsum", "dolor", "sit", "amet"],
    description: short
      ? `Lorem ipsum dolor sit amet consectetur adipisicing elit.
         Iste id qui dolorum nobis voluptate temporibus eius animi
         culpa commodi aut!`
      : `Lorem ipsum dolor sit amet consectetur adipisicing elit.
         Tenetur, deleniti? Tempore quisquam vero labore illo culpa
         veritatis nam dolorum alias saepe et fugiat, odit explicabo
         nesciunt sequi enim facilis praesentium veniam quis iure
         beatae, deleniti quod eos, voluptate laudantium. Aliquid,
         nobis vitae obcaecati amet unde quae similique distinctio
         fugit vero!`,
  };
}

const clusters = [cluster(1, true), cluster(2), cluster(3), cluster(4), cluster(5)];

export const example = () => <Clusters clusters={clusters} />;
