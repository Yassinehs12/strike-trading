import React, { useState, useEffect, useRef } from "react";
import {
  Grid3x3,
} from "lucide-react";
import { Card } from "../components/ui/Primitives";

export const MarketHeatmapsPage = () => {
  const containerRef = useRef(null);
  const [market, setMarket] = useState("stocks"); // "stocks" | "crypto"

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;

    if (market === "stocks") {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
      script.text = JSON.stringify({
        exchanges: [],
        dataSource: "SPX500",
        grouping: "sector",
        blockSize: "market_cap_basic",
        blockColor: "change",
        locale: "en",
        symbolUrl: "",
        colorTheme: "dark",
        hasTopBar: true,
        isDataSetEnabled: true,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: "100%",
        height: "600",
      });
    } else {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js";
      script.text = JSON.stringify({
        dataSource: "Crypto",
        blockSize: "market_cap_calc",
        blockColor: "change",
        locale: "en",
        symbolUrl: "",
        colorTheme: "dark",
        hasTopBar: true,
        isDataSetEnabled: true,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: "100%",
        height: "600",
      });
    }
    containerRef.current.appendChild(script);
  }, [market]);

  return (
    <div className="p-4 md:p-6">
      <Card className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Grid3x3 size={16} className="text-[var(--accent)]" />
              <h3 className="font-bold text-[var(--text-primary)] text-sm">Market Heatmap</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Live performance across the market — block size by market cap, color by daily change.</p>
          </div>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button onClick={() => setMarket("stocks")} className={`px-4 py-2 text-sm font-medium transition-colors ${market === "stocks" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-tertiary)]"}`}>Stocks</button>
            <button onClick={() => setMarket("crypto")} className={`px-4 py-2 text-sm font-medium transition-colors ${market === "crypto" ? "bg-[var(--accent)] text-[var(--text-inverse)]" : "bg-[var(--bg-primary)] text-[var(--text-tertiary)]"}`}>Crypto</button>
          </div>
        </div>
        <div className="tradingview-widget-container rounded-lg overflow-hidden" ref={containerRef}>
          <div className="tradingview-widget-container__widget" />
        </div>
      </Card>
    </div>
  );
};

/* ============================================================
   ECONOMIC CALENDAR (live TradingView widget — dark themed to match
   the rest of the app; events are natively grouped by day)
   ============================================================ */
