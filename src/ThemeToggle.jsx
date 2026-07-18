import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeContext.jsx";

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle black/white theme"
      title={theme === "dark" ? "Switch to white theme" : "Switch to black theme"}
      className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors
        text-[var(--text-secondary)] hover:text-[var(--text-primary)]
        border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] ${className}`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
};

export default ThemeToggle;
