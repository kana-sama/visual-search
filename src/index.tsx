import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./app";

if (navigator.userAgent.indexOf("Firefox") !== -1) {
  const erorr = "Please use Chrome or Safari. Firefox doesn't support the necessary functionality.";
  alert(erorr);
  throw new Error(erorr);
}

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
