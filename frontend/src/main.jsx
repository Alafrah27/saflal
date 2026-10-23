import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { applyLanguage, getInitialLanguage } from "./language.js";

const initialLanguage = getInitialLanguage();
applyLanguage(initialLanguage);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App initialLanguage={initialLanguage} />
  </StrictMode>,
);
