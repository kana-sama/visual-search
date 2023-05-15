import { useState } from "react";

export function SecureInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
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
