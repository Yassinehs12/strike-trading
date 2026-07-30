import React from "react";

// Top-level crash net. Without this, any uncaught render error anywhere in
// the tree unmounts the whole app and the user sees a blank white page with
// no way to recover and no signal to us that anything went wrong. This
// catches it, shows a way out, and reports it if Vercel Analytics is
// present (it silently no-ops otherwise — safe in dev).
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Uncaught render error:", error, info);
    try {
      // Vercel Analytics' `track` is the one call already wired into this
      // app (see package.json: @vercel/analytics) — reuse it as a free,
      // zero-setup crash signal rather than pulling in a new dependency
      // like Sentry right now. Swap this for Sentry.captureException later
      // if you want stack traces / breadcrumbs.
      if (window.va) {
        window.va("event", { name: "client_crash", data: { message: error?.message?.slice(0, 200) } });
      }
    } catch { /* never let telemetry itself throw */ }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg-primary, #0a0a0c)", color: "var(--text-primary, #f4f4f5)",
        padding: "24px", textAlign: "center", fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted, #9ca3af)", marginBottom: 20, lineHeight: 1.5 }}>
            Strike Journal hit an unexpected error. Your trade data is safe — this is just a display problem.
            Reloading usually fixes it.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              background: "var(--accent, #3b82f6)", color: "#fff", border: "none",
              borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
