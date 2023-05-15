import { useEffect, useState } from "react";
import { Meta } from "@storybook/react";
import { Progress, ProgressView, useProgress } from "./progress";
import { useEffectAsync } from "./hooks/use-effect-async";

export default {
  component: ProgressView,
  decorators: [
    Story => (
      <WithReset>
        <Story />
      </WithReset>
    ),
  ],
} satisfies Meta<typeof ProgressView>;

function WithReset({ children }: { children: React.ReactElement }) {
  const [resets, setResets] = useState(0);
  return (
    <>
      <div>
        <button onClick={() => setResets(x => x + 1)}>reset</button>
      </div>
      <div key={resets}>{children}</div>
    </>
  );
}

export function StatisExample() {
  const progress = new Progress();
  progress.step("Step 1").complete();
  progress.step("Step 2").complete();
  progress.step("Step 3");

  return <ProgressView progress={progress} />;
}

export function DynamicExample() {
  const progress = useProgress();

  useEffectAsync(async () => {
    progress.reset();

    const stepLoadingSomething = progress.step("Loading something...");
    await sleep(1000);
    stepLoadingSomething.complete();

    function mkLoadingArticles(amount: number, total: number) {
      return `Loading articles: ${amount}/${total}`;
    }

    const stepLoadingArticles = progress.step(mkLoadingArticles(0, 100));
    for (let i = 1; i <= 100; i++) {
      stepLoadingArticles.setMessage(mkLoadingArticles(i, 100));
      await sleep(20);
    }
    stepLoadingArticles.complete();

    const stepParallel1 = progress.step("Parallel step 1");
    const stepParallel2 = progress.step("Parallel step 1");
    await sleep(1000);
    stepParallel2.complete();
    await sleep(1000);
    stepParallel1.complete();
  }, []);

  return <ProgressView progress={progress} />;
}

function sleep(duration: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, duration));
}
