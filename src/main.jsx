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

// Register the service worker (needed for the browser's "Install app" option).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
