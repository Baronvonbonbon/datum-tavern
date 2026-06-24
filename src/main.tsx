import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Build stamp — also forces fresh asset hashes per deploy (avoids stale CDN
// negative-cache on hashed asset URLs).
console.info("Datum Tavern build", "2026-06-24.2");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
