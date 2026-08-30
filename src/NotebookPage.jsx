import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Plus, Search, Pin, PinOff, Trash2, Loader2, NotebookPen, Tag, X, CheckCircle2,
  Star, ChevronDown, MoreVertical, Save,
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

const STARTER_TEMPLATES = [
  { title: "Trading Playbook", content: "Setup criteria:\n- \n\nEntry rules:\n- \n\nExit rules:\n- \n\nRisk per trade:\n- \n\nWhen NOT to take this setup:\n- ", tags: ["playbook"] },
  { title: "Mistakes To Avoid", content: "1. \n2. \n3. ", tags: ["psychology"] },
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
  const clean = (content || "").replace(/\s+/g, " ").trim();
  return clean.length > len ? clean.slice(0, len) + "…" : clean || "No content yet";
}

export default function NotebookPage({ session, toast }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  // Title/content are edited locally and only written to the server when
  // the person hits Save (or Cmd/Ctrl+S) — no autosave-while-typing.
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const draftRef = useRef({ title: "", content: "" });
  useEffect(() => { draftRef.current = { title: draftTitle, content: draftContent }; }, [draftTitle, draftContent]);

  const notify = (msg, type) => (toast ? toast(msg, type) : undefined);

  const load = useCallback(() => {
    setLoading(true);
    fetchNotebookNotes(session.user.id)
      .then((data) => {
        setNotes(data);
        setSelectedId((cur) => cur && data.some((n) => n.id === cur) ? cur : (data[0]?.id ?? null));
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
    return notes.filter((n) => {
      if (activeTag && !(n.tags || []).includes(activeTag)) return false;
      if (!q) return true;
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    });
  }, [notes, search, activeTag]);

  const selected = notes.find((n) => n.id === selectedId) || null;

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

  const patchLocal = (id, patch) => setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  // Immediate save for discrete, non-typing actions (tags, color, pin) —
  // these aren't the "autosave" behavior being removed, they're one-off
  // clicks/selections that should persist right away, same as before.
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
      const created = await createNotebookNote(template || { title: "Untitled note", content: "", tags: [] }, session.user.id);
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);
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
        return [...others, updated].sort((a, b) => (b.pinned - a.pinned) || (new Date(b.updatedAt) - new Date(a.updatedAt)));
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
      if (selectedId === n.id) setSelectedId(null);
      notify("Note deleted");
    } catch (err) {
      notify(err.message || "Failed to delete note.", "error");
    }
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

  return (
    <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-72px)]">
      {/* ---------- left rail: note list ---------- */}
      <div className="w-full md:w-80 shrink-0 border-r border-white/10 flex flex-col bg-white/[0.015]">
        <div className="p-3 border-b border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..."
                className="w-full bg-[var(--bg-primary)] border border-white/10 focus:border-[var(--accent)]/60 outline-none rounded-lg pl-8 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-zinc-600" />
            </div>
            <div className="relative">
              <button onClick={() => setShowTemplates((v) => !v)}
                className="flex items-center gap-1 text-sm font-semibold px-2.5 py-2 rounded-lg bg-[var(--accent)] text-[var(--text-inverse)] hover:opacity-90 transition-opacity">
                <Plus size={15} />
              </button>
              {showTemplates && (
                <div className="absolute right-0 mt-1.5 w-56 bg-[var(--bg-secondary)] border border-white/10 rounded-lg shadow-xl z-20 py-1">
                  <button onClick={() => { if (confirmDiscardIfDirty()) addNote({ title: "Untitled note", content: "", tags: [] }); }}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-white/5 flex items-center gap-2">
                    <NotebookPen size={13} /> Blank note
                  </button>
                  <div className="border-t border-white/10 my-1" />
                  <div className="px-3 pt-1 pb-1 text-[10px] uppercase tracking-wide text-[var(--text-faint)]">Templates</div>
                  {STARTER_TEMPLATES.map((t) => (
                    <button key={t.title} onClick={() => { if (confirmDiscardIfDirty()) addNote(t); }}
                      className="w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]">
                      {t.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setActiveTag(null)}
                className={`text-[11px] font-medium px-2 py-1 rounded-full border transition-colors ${!activeTag ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]" : "border-white/10 text-[var(--text-faint)] hover:text-[var(--text-secondary)]"}`}>
                All
              </button>
              {allTags.map((t) => (
                <button key={t} onClick={() => setActiveTag(t === activeTag ? null : t)}
                  className={`text-[11px] font-medium px-2 py-1 rounded-full border transition-colors ${activeTag === t ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]" : "border-white/10 text-[var(--text-faint)] hover:text-[var(--text-secondary)]"}`}>
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex justify-center py-10"><Loader2 size={18} className="text-[var(--accent)] animate-spin" /></div>}
          {!loading && filteredNotes.length === 0 && (
            <div className="text-center py-12 px-4">
              <NotebookPen size={22} className="mx-auto text-[var(--text-faint)] mb-2" />
              <p className="text-sm text-[var(--text-muted)]">{notes.length === 0 ? "Your notebook is empty." : "No notes match your search."}</p>
              {notes.length === 0 && (
                <button onClick={() => addNote()} className="mt-3 text-xs font-semibold text-[var(--accent)] hover:underline">Create your first note</button>
              )}
            </div>
          )}
          {filteredNotes.map((n) => {
            const color = COLORS[n.color] || COLORS.default;
            const isActive = n.id === selectedId;
            return (
              <button key={n.id} onClick={() => { if (confirmDiscardIfDirty()) setSelectedId(n.id); }}
                className={`w-full text-left px-3.5 py-3 border-b border-white/[0.06] transition-colors ${isActive ? "bg-[var(--accent)]/10" : "hover:bg-white/[0.03]"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
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

      {/* ---------- right pane: editor ---------- */}
      <div className="flex-1 min-w-0 flex flex-col">
        {error && <div className="m-4 text-sm text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg px-4 py-2.5">{error}</div>}

        {!selected && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <NotebookPen size={32} className="text-[var(--text-faint)] mb-3" />
            <p className="text-sm text-[var(--text-muted)] max-w-xs">Your notebook for playbooks, psychology notes, checklists, and anything worth remembering — separate from your trade log.</p>
            <button onClick={() => { if (confirmDiscardIfDirty()) addNote(); }} className="mt-4 flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg bg-[var(--accent)] text-[var(--text-inverse)]">
              <Plus size={14} /> New Note
            </button>
          </div>
        )}

        {selected && (
          <>
            <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-white/10">
              <input value={draftTitle} onChange={(e) => { setDraftTitle(e.target.value); setDirty(true); }}
                placeholder="Untitled note"
                className="flex-1 min-w-0 bg-transparent outline-none text-lg font-bold text-[var(--text-primary)] placeholder-zinc-600" />
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={saveNote} disabled={!dirty || saving} title="Save (Ctrl/Cmd+S)"
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                    dirty && !saving
                      ? "bg-[var(--accent)] border-[var(--accent)] text-[var(--text-inverse)] hover:opacity-90"
                      : "border-white/10 text-[var(--text-faint)] cursor-default"
                  }`}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : savedFlash ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Save size={13} />}
                  {saving ? "Saving…" : savedFlash ? "Saved" : "Save"}
                </button>
                <div className="relative">
                  <button onClick={() => setColorMenuOpen((v) => !v)} title="Color"
                    className={`w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center hover:border-white/20 transition-colors`}>
                    <span className={`w-3 h-3 rounded-full ${COLORS[selected.color]?.dot || COLORS.default.dot}`} />
                  </button>
                  {colorMenuOpen && (
                    <div className="absolute right-0 mt-1.5 bg-[var(--bg-secondary)] border border-white/10 rounded-lg shadow-xl z-20 p-2 flex gap-1.5">
                      {Object.entries(COLORS).map(([key, c]) => (
                        <button key={key} title={c.label} onClick={() => { saveField(selected.id, { color: key }); setColorMenuOpen(false); }}
                          className={`w-6 h-6 rounded-full ${c.dot} ${selected.color === key ? "ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] " + c.ring : ""}`} />
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => togglePin(selected)} title={selected.pinned ? "Unpin" : "Pin"}
                  className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-amber-400 hover:border-amber-400/30 transition-colors">
                  {selected.pinned ? <Pin size={13} className="text-amber-400 fill-amber-400" /> : <PinOff size={13} />}
                </button>
                <button onClick={() => { if (confirmDiscardIfDirty()) removeNote(selected); }} title="Delete"
                  className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-[var(--text-tertiary)] hover:text-rose-400 hover:border-rose-400/30 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap px-5 py-2.5 border-b border-white/10">
              <Tag size={12} className="text-[var(--text-faint)]" />
              {(selected.tags || []).map((t) => (
                <span key={t} className="flex items-center gap-1 text-[11px] font-medium bg-white/5 border border-white/10 text-[var(--text-secondary)] rounded-full pl-2 pr-1 py-0.5">
                  #{t}
                  <button onClick={() => removeTagFromSelected(t)} className="hover:text-rose-400"><X size={10} /></button>
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTagToSelected(tagInput); } }}
                onBlur={() => tagInput && addTagToSelected(tagInput)}
                placeholder="add tag..." className="bg-transparent outline-none text-[11px] text-[var(--text-primary)] placeholder-zinc-600 w-24" />
              <span className="ml-auto text-[10px] text-[var(--text-faint)]">Updated {timeAgo(selected.updatedAt)}</span>
            </div>

            <textarea
              value={draftContent}
              onChange={(e) => { setDraftContent(e.target.value); setDirty(true); }}
              placeholder="Write freely — playbooks, mistakes to avoid, checklists, mindset notes, anything worth remembering..."
              className="flex-1 w-full bg-transparent outline-none resize-none px-5 py-4 text-sm leading-relaxed text-[var(--text-primary)] placeholder-zinc-600"
            />
          </>
        )}
      </div>
    </div>
  );
}
