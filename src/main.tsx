import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./finance.css";
import "./inventory.css";
import "./auth.css";
import "./workshop.css";
import "./backup.css";
import "./settings.css";
import "./record-delete-actions.css";
import "./themes.css";
import "./document-theme.css";
import { getTheme } from "./lib/theme";

document.documentElement.dataset.theme = getTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
