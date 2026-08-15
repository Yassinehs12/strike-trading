import React, { useEffect, useRef, useState } from "react";
import { Filter, CalendarClock } from "lucide-react";
import { IMPACT_LEVELS, ECON_COUNTRIES } from "../constants";
import { Card } from "../components/ui/Primitives";
import { useTheme } from "../ThemeContext";

// TradingView's economic calendar is a sandboxed iframe widget — the only
// things we can control are the params it accepts (theme, importance
// filter, country filter, size). We can't reach into its internal
// rendering to add day tabs, custom badges, or an "actual" column; that
// was the whole reason a custom Forex-Factory-backed version existed for
// a while. This is the simpler, TradingView-data version.
export const EconomicCalendarPage = () => {
  const { theme } = useTheme();
  const containerRef = useRef(null);
  const [impacts, setImpacts] = useState(["-1", "0", "1"]);
  const [countries, setCountries] = useState(ECON_COUNTRIES.map((c) => c.code));
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);

  const toggleImpact = (v) => setImpacts((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleCountry = (c) => setCountries((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const allCountriesSelected = countries.length === ECON_COUNTRIES.length;
  const toggleAllCountries = () => setCountries(allCountriesSelected ? [] : ECON_COUNTRIES.map((c) => c.code));

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: theme === "light" ? "light" : "dark",
      isTransparent: true,
      width: "100%",
      height: "650",
      locale: "en",
      importanceFilter: impacts.join(","),
      countryFilter: countries.join(","),
    });
    containerRef.current.appendChild(script);
  }, [impacts, countries, theme]);

  return (
    <div className="p-4 md:p-6">
      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock size={16} className="text-[var(--accent)]" />
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Economic Calendar</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">Live economic events, grouped by day — rate decisions, CPI, NFP, and more that can move the markets you trade. Powered by TradingView.</p>

        <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-white/10">
          {IMPACT_LEVELS.map((lvl) => {
            const on = impacts.includes(lvl.value);
            return (
              <button key={lvl.value} onClick={() => toggleImpact(lvl.value)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${on ? lvl.active : "bg-transparent border-white/15 text-[var(--text-faint)] hover:border-white/25 hover:text-[var(--text-muted)]"}`}>
                {lvl.label}
              </button>
            );
          })}

          <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

          <div className="relative">
            <button onClick={() => setCountryMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-transparent text-xs font-semibold text-[var(--text-secondary)] hover:border-white/25 hover:text-[var(--text-primary)] transition-colors">
              <Filter size={12} /> Countries {allCountriesSelected ? "(All)" : `(${countries.length})`}
            </button>
            {countryMenuOpen && (
              <div className="absolute z-30 mt-2 w-56 bg-[var(--bg-primary)] border border-white/10 rounded-lg shadow-2xl p-2 tj-animate-in">
                <button onClick={toggleAllCountries} className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold text-[var(--accent)] hover:bg-white/5 transition-colors mb-1">
                  {allCountriesSelected ? "Clear all" : "Select all"}
                </button>
                <div className="max-h-64 overflow-y-auto tj-scrollbar space-y-0.5">
                  {ECON_COUNTRIES.map((c) => (
                    <label key={c.code} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-white/5 cursor-pointer transition-colors">
                      <input type="checkbox" checked={countries.includes(c.code)} onChange={() => toggleCountry(c.code)} className="accent-blue-500" />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="tradingview-widget-container" ref={containerRef} />
      </Card>
    </div>
  );
};
