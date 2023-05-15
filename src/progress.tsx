import { useRef, useReducer, useEffect } from "react";
import styled from "styled-components";

export class ProgressStep {
  private static id = 0;

  private progress: null | Progress;

  public id: number;
  public message: string;
  public isComplete: boolean;

  constructor(message: string, progress: Progress) {
    this.id = ProgressStep.id++;
    this.message = message;
    this.progress = progress;
    this.isComplete = false;
  }

  public complete() {
    this.isComplete = true;
    this.progress?.emit();
  }

  public setMessage(message: string) {
    this.message = message;
    this.progress?.emit();
  }

  public dispose() {
    this.progress = null;
  }
}

export class Progress extends EventTarget {
  public steps: ProgressStep[] = [];

  public emit() {
    this.dispatchEvent(new Event("update"));
  }

  public step(message: string): ProgressStep {
    const step = new ProgressStep(message, this);
    this.steps.push(step);
    this.emit();
    return step;
  }

  public reset() {
    for (const step of this.steps) {
      step.dispose();
    }

    this.steps = [];
    this.emit();
  }
}

export function useProgress(): Progress {
  const progressRef = useRef(new Progress());
  return progressRef.current;
}

export function ProgressView({ progress }: { progress: Progress }) {
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    progress.addEventListener("update", forceUpdate);
    return () => progress.removeEventListener("update", forceUpdate);
  }, [progress]);

  return (
    <ProgressStepList>
      {progress.steps.map(step => (
        <ProgressStepItem key={step.id} complete={step.isComplete}>
          <ProgressStepItemCheck checked={step.isComplete} readOnly />
          {step.message}
        </ProgressStepItem>
      ))}
    </ProgressStepList>
  );
}

const ProgressStepList = styled.div`
  display: flex;
  flex-direction: column;
`;

const ProgressStepItemCheck = styled.input.attrs({ type: "checkbox" })`
  margin-right: 4px;
`;

const ProgressStepItem = styled.label<{ complete: boolean }>`
  display: flex;
  align-items: center;

  color: ${props => (props.complete ? "#171" : "#222")};
`;
