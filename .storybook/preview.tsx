import React from "react";
import type { Preview } from "@storybook/react";
import * as blocks from "@storybook/blocks";
import "bulma/css/bulma.css";

export default {
  parameters: {
    docs: {
      page: () => (
        <>
          <blocks.Title />
          <blocks.Subtitle />
          <blocks.Description />
          <blocks.ArgTypes />
          <blocks.Stories title="Examples" />
        </>
      ),
    },
  },
} satisfies Preview;
