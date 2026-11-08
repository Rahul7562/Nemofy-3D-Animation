import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { StudioApp } from "./components/StudioApp";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <StudioApp />
    </React.StrictMode>,
  );
}
