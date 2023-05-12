import { useState, useEffect, useCallback } from "react";

export function useStateStored<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T
): [T, (newValue: T) => void] {
  const [internalValue, setInternalValue] = useState(initial);

  useEffect(() => {
    function tryLoadValue() {
      const maybeStoredValue = localStorage.getItem(key);
      if (maybeStoredValue === null) return;

      const storedValue: unknown = JSON.parse(maybeStoredValue);
      if (!isValid(storedValue)) return;

      setInternalValue(storedValue);
    }

    tryLoadValue();

    window.addEventListener("storage", tryLoadValue);
    return () => window.removeEventListener("storage", tryLoadValue);
  }, [key]);

  const setValue = useCallback(
    (newValue: T) => {
      setInternalValue(newValue);
      localStorage.setItem(key, JSON.stringify(newValue));
    },
    [key]
  );

  return [internalValue, setValue];
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}
