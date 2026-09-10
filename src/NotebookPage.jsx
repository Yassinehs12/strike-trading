import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Plus, Search, Pin, PinOff, Trash2, Loader2, NotebookPen, Tag, X, CheckCircle2,
  ChevronDown, MoreVertical, Save, ArrowLeft, BookOpen, Brain, LineChart, ShieldAlert,
  FileText, Bold, Italic, Heading2, List, ListOrdered, CheckSquare, Quote, Code, Minus,
  SlidersHorizontal, ArrowUpDown, LayoutTemplate,
} from "lucide-react";
import { fetchNotebookNotes, createNotebookNote, updateNotebookNote, deleteNotebookNote } from "./db";

const COLORS = {
  default: { dot: "bg-zinc-500", ring: "ring-zinc-500/30", label: "Default" },
  blue: { dot: "bg-blue-400", ring: "ring-blue-400/30", label: "Blue" },
  emerald: { dot: "bg-emerald-400", ring: "ring-emerald-400/30", label: "Emerald" },
  amber: { dot: "bg-amber-400", ring: "ring-amber-400/30", label: "Amber" },
  rose: { dot: "bg-rose-400", ring: "ring-rose-400/30", label: "Rose" },
  violet: { dot: "bg-violet-400", ring: "ring-violet-400/30", label: "Violet" },
};

// Note "category" is a light, optional classification — never mandatory,
// never blocking. It just gives the list and the overview something more
// useful to group/scan by than a flat pile of notes.
const CATEGORIES = {
  general:    { label: "General",        icon: FileText,    tint: "text-zinc-400" },
  playbook:   { label: "Playbook",       icon: BookOpen,     tint: "text-blue-400" },
  psychology: { label: "Psychology",     icon: Brain,        tint: "text-violet-400" },
  insight:    { label: "Market Insight", icon: LineChart,    tint: "text-emerald-400" },
  risk:       { label: "Risk Mgmt",      icon: ShieldAlert,  tint: "text-amber-400" },
};
const CATEGORY_ORDER = ["general", "playbook", "psychology", "insight", "risk"];

const SORTS = {
  updated: { label: "Recently Updated", fn: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt) },
  created: { label: "Recently Created", fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  pinned:  { label: "Pinned First",     fn: (a, b) => (b.pinned - a.pinned) || (new Date(b.updatedAt) - new Date(a.updatedAt)) },
};

// Optional structured skeletons a person can drop into a note — never
// forced. Selecting one just seeds the content textarea with headings.
const STRUCTURE_TEMPLATES = [
  {
    key: "note", label: "Structured Note", category: "general",
    body: "## Key Idea\n\n\n## Why It Matters\n\n\n## Rules\n\n- \n\n## Examples\n\n\n## Mistakes\n\n\n## Lessons Learned\n\n",
  },
  {
    key: "playbook", label: "Trading Playbook", category: "playbook",
    body: "## Setup\n\n\n## Market Conditions\n\n\n## Entry\n\n- \n\n## Stop Loss\n\n\n## Take Profit\n\n\n## Invalidations\n\n- \n\n## Psychology\n\n\n## Backtesting Notes\n\n",
  },
  {
    key: "psychology", label: "Psychology Note", category: "psychology",
    body: "## What Happened\n\n\n## What I Felt\n\n\n## Trigger\n\n\n## Lesson\n\n",
  },
  {
    key: "insight", label: "Market Insight", category: "insight",
    body: "## Observation\n\n\n## Context\n\n\n## Implication\n\n\n## What Would Change My Mind\n\n",
  },
  {
    key: "mistakes", label: "Mistakes To Avoid", category: "psychology",
    body: "1. \n2. \n3. ",
  },
];

function timeAgo(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function excerpt(content, len = 90) {
  const clean = (content || "").replace(/[#*_>`-]/g, "").replace(/\s+/g, " ").trim();
  return clean.length > len ? clean.slice(0, len) + "…" : clean || "No content yet";
}

function CategoryIcon({ category, size = 12, className = "" }) {
  const c = CATEGORIES[category] || CATEGORIES.general;
  const Icon = c.icon;
  return <Icon size={size} className={`${c.tint} ${className}`} />;
}

export default function NotebookPage({ session, toast }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [sortKey, setSortKey] = useState("updated");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showStructureMenu, setShowStructureMenu] = useState(false);
  // On small screens the list and editor share one column; this tracks
  // which one is showing. Desktop (md+) always shows both side by side.
  const [mobileView, setMobileView] = useState("list"); // "list" | "editor"

  // Title/content are edited locally and only written to the server when
  // the person hits Save (or Cmd/Ctrl+S) — no autosave-while-typing.
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const draftRef = useRef({ title: "", content: "" });
  const contentRef = useRef(null);
  useEffect(() => { draftRef.current = { title: draftTitle, content: draftContent }; }, [draftTitle, draftContent]);

  const notify = (msg, type) => (toast ? toast(msg, type) : undefined);

  const load = useCallback(() => {
    setLoading(true);
    fetchNotebookNotes(session.user.id)
      .then((data) => {
        setNotes(data);
      })
      .catch((err) => setError(err.message || "Failed to load notebook."))
      .finally(() => setLoading(false));
  }, [session.user.id]);

  useEffect(() => { load(); }, [load]);

  const allTags = useMemo(() => {
    const s = new Set();
    notes.forEach((n) => (n.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (showPinnedOnly && !n.pinned) return false;
        if (activeCategory && (n.category || "general") !== activeCategory) return false;
        if (activeTag && !(n.tags || []).includes(activeTag)) return false;
        if (!q) return true;
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      })
      .sort(SORTS[sortKey].fn);
  }, [notes, search, activeTag, activeCategory, showPinnedOnly, sortKey]);

  const selected = notes.find((n) => n.id === selectedId) || null;

  const stats = useMemo(() => ({
    total: notes.length,
    pinned: notes.filter((n) => n.pinned).length,
    playbook: notes.filter((n) => (n.category || "general") === "playbook").length,
    psychology: notes.filter((n) => (n.category || "general") === "psychology").length,
  }), [notes]);

  const recentNotes = useMemo(
    () => [...notes].sort(SORTS.updated.fn).slice(0, 5),
    [notes]
  );

  // Load the draft editor fields whenever the selected note changes
  // (switching notes, creating one, or the initial load resolving).
  useEffect(() => {
    setDraftTitle(selected?.title ?? "");
    setDraftContent(selected?.content ?? "");
    setDirty(false);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmDiscardIfDirty = () => {
    if (!dirty) return true;
    return window.confirm("You have unsaved changes to this note. Discard them?");
  };

  const openNote = (id) => {
    if (!confirmDiscardIfDirty()) return;
    setSelectedId(id);
    setMobileView("editor");
  };

  const backToList = () => {
    if (!confirmDiscardIfDirty()) return;
    setSelectedId(null);
    setMobileView("list");
  };

  const patchLocal = (id, patch) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  // Immediate save for discrete, non-typing actions (tags, color, pin,
  // category) — these aren't the "autosave" behavior being avoided for the
  // editor, they're one-off clicks/selections that should persist right away.
  const saveField = async (id, patch) => {
    patchLocal(id, patch);
    setSaving(true);
    try {
      const updated = await updateNotebookNote(id, patch);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      notify(err.message || "Failed to save note.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Explicit save for the title/content editor — triggered by the Save
  // button or Cmd/Ctrl+S, not by typing.
  const saveNote = useCallback(async () => {
    if (!selected) return;
    const { title, content } = draftRef.current;
    setSaving(true);
    try {
      const updated = await updateNotebookNote(selected.id, { title, content });
      setNotes((prev) => prev.map((n) => (n.id === selected.id ? updated : n)));
      setDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      notify(err.message || "Failed to save note.", "error");
    } finally {
      setSaving(false);
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (draftRef.current) saveNote();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveNote]);

  const addNote = async (template) => {
    try {
      const payload = template
        ? { title: template.title || "Untitled note", content: template.content || "", tags: template.tags || [], category: template.category || "general" }
        : { title: "Untitled note", content: "", tags: [], category: "general" };
      const created = await createNotebookNote(payload, session.user.id);
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setMobileView("editor");
      setShowTemplates(false);
      notify("Note created");
    } catch (err) {
      notify(err.message || "Failed to create note.", "error");
    }
  };

  const togglePin = async (n) => {
    const pinned = !n.pinned;
    patchLocal(n.id, { pinned });
    try {
      await updateNotebookNote(n.id, { pinned });
      setNotes((prev) => {
        const others = prev.filter((x) => x.id !== n.id);
        const updated = { ...n, pinned };
        return [...others, updated];
      });
    } catch (err) {
      notify(err.message || "Failed to update note.", "error");
    }
  };

  const removeNote = async (n) => {
    if (!window.confirm(`Delete "${n.title}"? This can't be undone.`)) return;
    try {
      await deleteNotebookNote(n.id);
      setNotes((prev) => prev.filter((x) => x.id !== n.id));
      if (selectedId === n.id) { setSelectedId(null); setMobileView("list"); }
      notify("Note deleted");
    } catch (err) {
      notify(err.message || "Failed to delete note.", "error");
    }
  };

  const setCategory = (category) => {
    if (!selected) return;
    saveField(selected.id, { category });
    setMoreMenuOpen(false);
  };

  const addTagToSelected = (raw) => {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || !selected) return;
    if ((selected.tags || []).includes(tag)) { setTagInput(""); return; }
    saveField(selected.id, { tags: [...(selected.tags || []), tag] });
    setTagInput("");
  };

  const removeTagFromSelected = (tag) => {
    if (!selected) return;
    saveField(selected.id, { tags: (selected.tags || []).filter((t) => t !== tag) });
  };

  // ---------- formatting toolbar: lightweight markdown insertion ----------
  // The editor stays a plain textarea (so save/dirty/undo behavior is
  // unchanged) — the toolbar just wraps or prefixes the current selection.
  const applyFormat = (kind) => {
    const el = contentRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selectedText = value.slice(s, e);
    let insert = selectedText;
    let cursorOffset = null;

    const wrap = (mark) => `${mark}${selectedText || "text"}${mark}`;
    const linePrefix = (prefix) => {
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      return { lineStart, text: prefix };
    };

    switch (kind) {
      case "bold": insert = wrap("**"); break;
      case "italic": insert = wrap("_"); break;
      case "heading": insert = `## ${selectedText || "Heading"}`; break;
      case "bullet": insert = (selectedText || "List item").split("\n").map((l) => `- ${l}`).join("\n"); break;
      case "ordered": insert = (selectedText || "List item").split("\n").map((l, i) => `${i + 1}. ${l}`).join("\n"); break;
      case "checklist": insert = (selectedText || "Task").split("\n").map((l) => `- [ ] ${l}`).join("\n"); break;
      case "quote": insert = (selectedText || "Quote").split("\n").map((l) => `> ${l}`).join("\n"); break;
      case "code": insert = selectedText.includes("\n") ? `\`\`\`\n${selectedText || "code"}\n\`\`\`` : wrap("`"); break;
      case "divider": insert = `${selectedText ? selectedText + "\n" : ""}\n---\n`; break;
      default: break;
    }

    const next = value.slice(0, s) + insert + value.slice(e);
    setDraftContent(next);
    setDirty(true);
    requestAnimationFrame(() => {
      el.focus();
      const pos = s + insert.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertStructure = (tpl) => {
    setDraftContent((prev) => (prev ? prev + "\n\n" + tpl.body : tpl.body));
    setDirty(true);
    if (selected && (selected.category || "general") === "general" && tpl.category) {
      saveField(selected.id, { category: tpl.category });
    }
    setShowStructureMenu(false);
  };

  const TOOLBAR_ACTIONS = [
    { key: "bold", icon: Bold, title: "Bold" },
    { key: "italic", icon: Italic, title: "Italic" },
    { key: "heading", icon: Heading2, title: "Heading" },
    { key: "bullet", icon: List, title: "Bullet list" },
    { key: "ordered", icon: ListOrdered, title: "Numbered list" },
    { key: "checklist", icon: CheckSquare, title: "Checklist" },
    { key: "quote", icon: Quote, title: "Quote" },
    { key: "code", icon: Code, title: "Code" },
    { key: "divider", icon: Minus, title: "Divider" },
  ];

  const clearFilters = () => { setSearch(""); setActiveTag(null); setActiveCategory(null); setShowPinnedOnly(false); };
  const hasFilters = !!(search || activeTag || activeCategory || showPinnedOnly);

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-72px)]">
      {/* ---------- left rail: note list ---------- */}
      <div className={`w-full md:w-80 shrink-0 border-r border-white/10 flex-col bg-white/[0.015] ${mobileView === "list" ? "flex" : "hidden md:flex"}`}>
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..."
                className="w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 outline-none rounded-lg pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600 transition-colors" />
            </div>
            <div className="relative">
              <button onClick={() => setShowTemplates((v) => !v)}
                className="flex items-center gap-1 text-sm font-semibold px-2.5 py-2 rounded-lg bg-[var(--accent)] text-[var(--text-inverse)] hover:opacity-90 active:scale-95 transition-all">
                <Plus size={15} />
              </button>
              {showTemplates && (
                <div className="absolute right-0 mt-1.5 w-60 bg-[var(--bg-secondary)] border border-white/10 rounded-lg shadow-xl z-20 py-1">
                  <button onClick={() => addNote({ title: "Untitled note", content: "", tags: [] })}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-white/5 flex items-center gap-2 transition-colors">
                    <NotebookPen size={13} /> Blank note
                  </button>
                  <div className="border-t border-white/10 my-1" />
                  <div className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wide text-[var(--text-faint)]">Templates</div>
                  {STRUCTURE_TEMPLATES.map((t) => (
                    <button key={t.key} onClick={() => addNote({ title: t.label, content: t.body, tags: [], category: t.category })}
                      className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors">
                      <CategoryIcon category={t.category} size={13} /> {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* category chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setActiveCategory(null)}
              className={`text-[11px] font-medium px-2 py-1 rounded-full border transition-colors ${!activeCategory ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]" : "border-white/10 text-[var(--text-faint)] hover:text-[var(--text-secondary)]"}`}>
              All
            </button>
            {CATEGORY_ORDER.map((key) => {
              const c = CATEGORIES[key];
              const active = activeCategory === key;
              return (
                <button key={key} onClick={() => setActiveCategory(active ? null : key)}
                  className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border transition-colors ${active ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]" : "border-white/10 text-[var(--text-faint)] hover:text-[var(--text-secondary)]"}`}>
                  <CategoryIcon category={key} size={10} className={active ? "text-[var(--accent)]" : ""} /> {c.label}
                </button>
              );
            })}
          </div>

          {/* utility row: pinned toggle, tag filter, sort */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowPinnedOnly((v) => !v)} title="Pinned only"
              className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors ${showPinnedOnly ? "bg-amber-400/10 border-amber-400/40 text-amber-400" : "border-white/10 text-[var(--text-faint)] hover:text-[var(--text-secondary)]"}`}>
              <Pin size={11} className={showPinnedOnly ? "fill-amber-400" : ""} /> Pinned
            </button>

            <div className="relative">
              <button onClick={() => setTagMenuOpen((v) => !v)} title="Filter by tag"
                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors ${activeTag ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]" : "border-white/10 text-[var(--text-faint)] hover:text-[var(--text-secondary)]"}`}>
                <SlidersHorizontal size={11} /> {activeTag ? `#${activeTag}` : "Tags"} <ChevronDown size={10} />
              </button>
              {tagMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-44 max-h-56 overflow-y-auto bg-[var(--bg-secondary)] border border-white/10 rounded-lg shadow-xl z-20 py-1">
                  {allTags.length === 0 && <div className="px-3 py-2 text-xs text-[var(--text-faint)]">No tags yet</div>}
                  {allTags.map((t) => (
                    <button key={t} onClick={() => { setActiveTag(t === activeTag ? null : t); setTagMenuOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${activeTag === t ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"} hover:bg-white/5`}>
                      #{t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative ml-auto">
              <button onClick={() => setSortMenuOpen((v) => !v)} title="Sort"
                className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border border-white/10 text-[var(--text-faint)] hover:text-[var(--text-secondary)] transition-colors">
                <ArrowUpDown size={11} /> <ChevronDown size={10} />
              </button>
              {sortMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-[var(--bg-secondary)] border border-white/10 rounded-lg shadow-xl z-20 py-1">
                  {Object.entries(SORTS).map(([key, s]) => (
                    <button key={key} onClick={() => { setSortKey(key); setSortMenuOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${sortKey === key ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"} hover:bg-white/5`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex justify-center py-10"><Loader2 size={18} className="text-[var(--accent)] animate-spin" /></div>}

          {!loading && filteredNotes.length === 0 && (
            <div className="text-center py-12 px-4">
              <NotebookPen size={22} className="mx-auto text-[var(--text-faint)] mb-2" />
              {notes.length === 0 ? (
                <>
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">Build your trading knowledge</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[220px] mx-auto">Save strategies, lessons, psychology notes, and market insights so your experience compounds over time.</p>
                  <button onClick={() => addNote()} className="mt-3 text-xs font-semibold text-[var(--accent)] hover:underline">+ Create your first note</button>
                </>
              ) : hasFilters ? (
                <>
                  <p className="text-sm text-[var(--text-muted)]">No notes match these filters.</p>
                  <button onClick={clearFilters} className="mt-2 text-xs font-semibold text-[var(--accent)] hover:underline">Clear filters</button>
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No notes here yet.</p>
              )}
            </div>
          )}

          {filteredNotes.map((n) => {
            const color = COLORS[n.color] || COLORS.default;
            const isActive = n.id === selectedId;
            return (
              <button key={n.id} onClick={() => openNote(n.id)}
                className={`w-full text-left px-3.5 py-3 border-b border-white/[0.06] transition-colors ${isActive ? "bg-[var(--accent)]/10" : "hover:bg-white/[0.03]"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
                    <CategoryIcon category={n.category} size={12} className="shrink-0" />
                    <span className={`text-sm font-semibold truncate ${isActive ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>{n.title || "Untitled note"}</span>
                  </div>
                  {n.pinned && <Pin size={11} className="text-amber-400 fill-amber-400 shrink-0 mt-0.5" />}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{excerpt(n.content)}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex gap-1 flex-wrap">
                    {(n.tags || []).slice(0, 2).map((t) => (
                      <span key={t} className="text-[10px] text-[var(--text-faint)]">#{t}</span>
                    ))}
                  </div>
                  <span className="text-[10px] text-[var(--text-faint)] shrink-0">{timeAgo(n.updatedAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- right pane: editor / overview ---------- */}
      <div className={`flex-1 min-w-0 flex-col ${mobileView === "editor" ? "flex" : "hidden md:flex"}`}>
        {error && <div className="m-4 text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

        {/* ---------- overview state: shown when nothing is selected ---------- */}
        {!selected && !loading && !error && (
          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Your Trading Knowledge</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1.5">Capture strategies, lessons, psychology notes, and market insights.</p>

              {notes.length > 0 && (
                <div className="grid grid-cols-4 gap-2.5 mt-6">
                  {[
                    { label: "Total Notes", value: stats.total },
                    { label: "Pinned", value: stats.pinned },
                    { label: "Playbooks", value: stats.playbook },
                    { label: "Psychology", value: stats.psychology },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                      <div className="text-lg font-bold text-[var(--text-primary)]">{s.value}</div>
                      <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-7">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-2">Quick Create</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "New Note", category: "general" },
                    { label: "New Playbook", category: "playbook" },
                    { label: "Psychology Note", category: "psychology" },
                    { label: "Market Insight", category: "insight" },
                  ].map((q) => (
                    <button key={q.label} onClick={() => addNote({ title: q.label === "New Note" ? "Untitled note" : q.label, content: "", tags: [], category: q.category })}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 px-3 py-3 transition-colors">
                      <CategoryIcon category={q.category} size={16} />
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {recentNotes.length > 0 && (
                <div className="mt-7">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)] mb-2">Recently Updated</div>
                  <div className="rounded-lg border border-white/10 divide-y divide-white/[0.06] overflow-hidden">
                    {recentNotes.map((n) => (
                      <button key={n.id} onClick={() => openNote(n.id)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-white/[0.03] transition-colors">
                        <CategoryIcon category={n.category} size={13} className="shrink-0" />
                        <span className="text-sm text-[var(--text-secondary)] truncate flex-1">{n.title || "Untitled note"}</span>
                        {n.pinned && <Pin size={10} className="text-amber-400 fill-amber-400 shrink-0" />}
                        <span className="text-[10px] text-[var(--text-faint)] shrink-0">{timeAgo(n.updatedAt)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {notes.length === 0 && (
                <div className="mt-10 flex flex-col items-center text-center">
                  <NotebookPen size={28} className="text-[var(--text-faint)] mb-3" />
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">Build your trading knowledge</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 max-w-xs">Save strategies, lessons, psychology notes, and market insights so your experience compounds over time.</p>
                  <button onClick={() => addNote()} className="mt-4 flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity">
                    <Plus size={14} /> Create your first note
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------- editor ---------- */}
        {selected && (
          <>
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/10 md:hidden">
              <button onClick={backToList} className="flex items-center gap-1 text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowLeft size={14} /> Notebook
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/10">
              <div className="flex-1 min-w-0">
                <input value={draftTitle} onChange={(e) => { setDraftTitle(e.target.value); setDirty(true); }}
                  placeholder="Untitled note"
                  className="w-full bg-transparent outline-none text-lg font-bold text-[var(--text-primary)] placeholder-zinc-600" />
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CategoryIcon category={selected.category} size={11} />
                  <span className="text-[11px] text-[var(--text-faint)]">{CATEGORIES[selected.category || "general"].label}</span>
                  <span className="text-[11px] text-[var(--text-faint)]">·</span>
                  <span className="text-[11px] text-[var(--text-faint)]">
                    {saving ? "Saving…" : dirty ? "Unsaved changes" : savedFlash ? "Saved" : `Updated ${timeAgo(selected.updatedAt)}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={saveNote} disabled={!dirty || saving} title="Save (Ctrl/Cmd+S)"
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                    dirty && !saving
                      ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--text-inverse)] hover:opacity-90"
                      : "border-white/10 text-[var(--text-faint)] cursor-default"
                  }`}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : savedFlash && !dirty ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Save size={13} />}
                  {saving ? "Saving…" : savedFlash && !dirty ? "Saved" : "Save"}
                </button>
                <div className="relative">
                  <button onClick={() => setColorMenuOpen((v) => !v)} title="Color"
                    className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors">
                    <span className={`w-3 h-3 rounded-full ${COLORS[selected.color]?.dot || COLORS.default.dot}`} />
                  </button>
                  {colorMenuOpen && (
                    <div className="absolute right-0 mt-1.5 bg-[var(--bg-secondary)] border border-white/10 rounded-lg shadow-xl z-20 p-2 flex gap-1.5">
                      {Object.entries(COLORS).map(([key, c]) => (
                        <button key={key} title={c.label} onClick={() => { saveField(selected.id, { color: key }); setColorMenuOpen(false); }}
                          className={`w-6 h-6 rounded-full ${c.dot} ${selected.color === key ? "ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] " + c.ring : ""} transition-transform hover:scale-110`} />
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => togglePin(selected)} title={selected.pinned ? "Unpin" : "Pin"}
                  className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-amber-400 hover:border-amber-400/30 transition-colors">
                  {selected.pinned ? <Pin size={13} className="text-amber-400 fill-amber-400" /> : <PinOff size={13} />}
                </button>
                <div className="relative">
                  <button onClick={() => setMoreMenuOpen((v) => !v)} title="More options"
                    className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors">
                    <MoreVertical size={13} />
                  </button>
                  {moreMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-48 bg-[var(--bg-secondary)] border border-white/10 rounded-lg shadow-xl z-20 py-1">
                      <div className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wide text-[var(--text-faint)]">Category</div>
                      {CATEGORY_ORDER.map((key) => (
                        <button key={key} onClick={() => setCategory(key)}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors hover:bg-white/5 ${(selected.category || "general") === key ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>
                          <CategoryIcon category={key} size={12} /> {CATEGORIES[key].label}
                        </button>
                      ))}
                      <div className="border-t border-white/10 my-1" />
                      <button onClick={() => { setMoreMenuOpen(false); if (confirmDiscardIfDirty()) removeNote(selected); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors">
                        <Trash2 size={12} /> Delete note
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap px-5 py-2.5 border-b border-white/10">
              <Tag size={12} className="text-[var(--text-faint)]" />
              {(selected.tags || []).map((t) => (
                <span key={t} className="flex items-center gap-1 text-[11px] font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] rounded-full pl-2 pr-1 py-0.5">
                  #{t}
                  <button onClick={() => removeTagFromSelected(t)} className="hover:text-rose-400 transition-colors"><X size={10} /></button>
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTagToSelected(tagInput); } }}
                onBlur={() => tagInput && addTagToSelected(tagInput)}
                placeholder="add tag..." className="bg-transparent outline-none text-[11px] text-[var(--text-primary)] placeholder-zinc-600 w-24" />
            </div>

            {/* formatting toolbar */}
            <div className="flex items-center gap-0.5 px-5 py-1.5 border-b border-white/10 overflow-x-auto">
              {TOOLBAR_ACTIONS.map((a) => (
                <button key={a.key} title={a.title} onClick={() => applyFormat(a.key)}
                  className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors">
                  <a.icon size={14} />
                </button>
              ))}
              <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />
              <div className="relative shrink-0">
                <button onClick={() => setShowStructureMenu((v) => !v)} title="Insert structured template"
                  className="flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors">
                  <LayoutTemplate size={13} /> Structure <ChevronDown size={10} />
                </button>
                {showStructureMenu && (
                  <div className="absolute left-0 mt-1.5 w-52 bg-[var(--bg-secondary)] border border-white/10 rounded-lg shadow-xl z-20 py-1">
                    {STRUCTURE_TEMPLATES.map((t) => (
                      <button key={t.key} onClick={() => insertStructure(t)}
                        className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors">
                        <CategoryIcon category={t.category} size={12} /> {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <textarea
                ref={contentRef}
                value={draftContent}
                onChange={(e) => { setDraftContent(e.target.value); setDirty(true); }}
                placeholder="Write freely — playbooks, mistakes to avoid, checklists, mindset notes, anything worth remembering..."
                className="w-full h-full min-h-[50vh] bg-transparent outline-none resize-none px-5 md:px-8 py-5 max-w-3xl mx-auto text-[15px] leading-[1.75] text-[var(--text-primary)] placeholder-zinc-600 font-[450]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
