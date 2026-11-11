import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./ThemeContext.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import CookieBanner from "./CookieBanner.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
        <CookieBanner />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
