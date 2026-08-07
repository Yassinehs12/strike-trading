import React, { useState, useEffect, useRef } from "react";
import {
  Filter, CalendarClock,
} from "lucide-react";
import { ECON_COUNTRIES, IMPACT_LEVELS } from "../constants";
import { Card } from "../components/ui/Primitives";

export const EconomicCalendarPage = () => {
  const containerRef = useRef(null);
  const [impacts, setImpacts] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("econCalendar.impacts")); return Array.isArray(saved) ? saved : ["1", "0", "-1"]; }
    catch { return ["1", "0", "-1"]; }
  });
  const [countries, setCountries] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("econCalendar.countries")); return Array.isArray(saved) ? saved : ECON_COUNTRIES.map((c) => c.code); }
    catch { return ECON_COUNTRIES.map((c) => c.code); }
  });
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);

  const toggleImpact = (v) => setImpacts((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const toggleCountry = (code) => setCountries((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  const allCountriesSelected = countries.length === ECON_COUNTRIES.length;
  const toggleAllCountries = () => setCountries(allCountriesSelected ? [] : ECON_COUNTRIES.map((c) => c.code));

  useEffect(() => {
    try { localStorage.setItem("econCalendar.impacts", JSON.stringify(impacts)); } catch {}
  }, [impacts]);

  useEffect(() => {
    try { localStorage.setItem("econCalendar.countries", JSON.stringify(countries)); } catch {}
  }, [countries]);

  const [widgetLoaded, setWidgetLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    setWidgetLoaded(false);
    containerRef.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => setWidgetLoaded(true);
    const config = {
      colorTheme: "dark",
      isTransparent: false,
      backgroundColor: "#000000",
      width: "100%",
      height: "680",
      locale: "en",
      importanceFilter: impacts.length ? impacts.join(",") : "-1,0,1",
    };
    if (countries.length && countries.length < ECON_COUNTRIES.length) config.countryFilter = countries.join(",");
    script.text = JSON.stringify(config);
    containerRef.current.appendChild(script);
    // The widget's own iframe fires a 'load' event after the script tag's
    // onload, so give it a beat before swapping out the skeleton.
    const t = setTimeout(() => setWidgetLoaded(true), 1200);
    return () => clearTimeout(t);
  }, [impacts, countries]);

  return (
    <div className="p-4 md:p-6">
      <Card className="p-4 md:p-5 !bg-black !border-white/10">
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
                <div className="max-h-56 overflow-y-auto tj-scrollbar space-y-0.5">
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

        <div className="relative rounded-lg overflow-hidden bg-black border border-white/10">
          {!widgetLoaded && (
            <div className="absolute inset-0 z-10 bg-black p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 rounded-md bg-white/[0.04] tj-skeleton" />
              ))}
            </div>
          )}
          <div className="tradingview-widget-container" ref={containerRef}>
            <div className="tradingview-widget-container__widget" />
          </div>
        </div>
      </Card>
    </div>
  );
};


/* ============================================================
   SETTINGS PAGE
   ============================================================ */
