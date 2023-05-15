import { useEffect } from "react";

export function useEffectAsync(effect: () => Promise<unknown>, deps: unknown[]) {
  // eslint-disable-next-line
  return useEffect(() => (effect(), undefined), deps);
}
