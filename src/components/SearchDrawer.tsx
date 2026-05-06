import { useState, useMemo } from "react";
import type { StickyNote } from "../types";
import { useTranslation } from "../i18n/I18nContext";
import { getBaseName } from "../lib/pathUtils";

interface Props {
  notes: StickyNote[];
  onShow: (id: string) => void;
  onRestoreFromStash: (id: string) => void;
  onRestoreFromGoat: (id: string) => void;
  onFeedGoat: (id: string) => void;
  onClose: () => void;
  history: string[];
  onHistoryClick: (q: string) => void;
  onHistoryClear: () => void;
  onSearchEnter: (q: string) => void;
}

export function SearchDrawer({ 
  notes, 
  onShow, 
  onRestoreFromStash, 
  onRestoreFromGoat, 
  onFeedGoat,
  onClose,
  history,
  onHistoryClick,
  onHistoryClear,
  onSearchEnter,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { active: [], stashed: [], deleted: [] };

    const filtered = notes.filter(n => {
      const body = n.body.toLowerCase();
      const title = (n.title || "").toLowerCase();
      const path = (n.path || "").toLowerCase();
      return body.includes(q) || title.includes(q) || path.includes(q);
    });

    return {
      active: filtered.filter(n => !n.deletedAt && !n.stashedAt),
      stashed: filtered.filter(n => !n.deletedAt && !!n.stashedAt),
      deleted: filtered.filter(n => !!n.deletedAt)
    };
  }, [notes, query]);

  const recentNotes = useMemo(() => {
    if (query.trim() !== "") return [];
    return [...notes]
      .sort((a, b) => {
        const timeA = new Date(a.lastInteractedAt || a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.lastInteractedAt || b.updatedAt || b.createdAt).getTime();
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [notes, query]);

  const isEmpty = query.trim() !== "" && results.active.length === 0 && results.stashed.length === 0 && results.deleted.length === 0;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const renderItem = (note: StickyNote, type: "active" | "stashed" | "deleted") => (
    <div key={note.id} className={`search-drawer__item search-drawer__item--${note.color}`}>
      <div className="search-drawer__item-header">
        <span className="search-drawer__item-date">
          {formatDate(note.updatedAt)}
          {note.locked && <span className="search-drawer__item-lock" title={t("lock.lockedHint")}> 🔒</span>}
        </span>
        <div className="search-drawer__item-actions">
          {type === "active" && (
            <button className="search-drawer__btn search-drawer__btn--open" onClick={() => onShow(note.id)}>
              {t("search.open")}
            </button>
          )}
          {type === "stashed" && (
            <>
              <button className="search-drawer__btn search-drawer__btn--restore" onClick={() => onRestoreFromStash(note.id)}>
                {t("search.restore")}
              </button>
              {!note.locked && (
                <button className="search-drawer__btn search-drawer__btn--goat" onClick={() => onFeedGoat(note.id)}>
                  🐐
                </button>
              )}
            </>
          )}
          {type === "deleted" && (
            <button className="search-drawer__btn search-drawer__btn--restore" onClick={() => onRestoreFromGoat(note.id)}>
              {t("search.restore")}
            </button>
          )}
        </div>
      </div>
      <div className="search-drawer__item-body">
        {note.title && <div className="search-drawer__item-title">{note.title}</div>}
        <div className="search-drawer__item-text">
          {note.kind === "file" || note.kind === "folder" || note.kind === "image"
            ? getBaseName(note.path || note.body)
            : note.body.slice(0, 100) + (note.body.length > 100 ? "..." : "")
          }
        </div>
      </div>
    </div>
  );

  return (
    <div className="search-drawer-overlay" onClick={onClose}>
      <div className="search-drawer" onClick={e => e.stopPropagation()}>
        <div className="search-drawer__header">
          <h3 className="search-drawer__title">🔍 {t("search.title")}</h3>
          <button className="search-drawer__close" onClick={onClose}>×</button>
        </div>

        <div className="search-drawer__search-box">
          <input
            type="text"
            className="search-drawer__input"
            placeholder={t("search.placeholder")}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && query.trim()) {
                onSearchEnter(query.trim());
              }
            }}
            autoFocus
          />
        </div>
        
        <div className="search-drawer__content">
          {isEmpty ? (
            <div className="search-drawer__empty">{t("search.empty")}</div>
          ) : (
            <div className="search-drawer__results">
              {query.trim() === "" ? (
                <>
                  {recentNotes.length > 0 && (
                    <div className="search-drawer__section">
                      <div className="search-drawer__section-title">🕒 {t("recent.title")}</div>
                      {recentNotes.map(n => {
                        let type: "active" | "stashed" | "deleted" = "active";
                        if (n.deletedAt) type = "deleted";
                        else if (n.stashedAt) type = "stashed";
                        return renderItem(n, type);
                      })}
                    </div>
                  )}
                  {history.length > 0 && (
                    <div className="search-drawer__section">
                      <div className="search-drawer__section-header">
                        <div className="search-drawer__section-title">📜 {t("search.history")}</div>
                        <button className="search-drawer__clear-btn" onClick={onHistoryClear}>
                          {t("search.clearHistory")}
                        </button>
                      </div>
                      <div className="search-drawer__history-list">
                        {history.map((h, i) => (
                          <button 
                            key={i} 
                            className="search-drawer__history-item"
                            onClick={() => onHistoryClick(h)}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {recentNotes.length === 0 && history.length === 0 && (
                    <div className="search-drawer__empty">{t("recent.empty")}</div>
                  )}
                </>
              ) : (
                <>
                  {results.active.length > 0 && (
                    <div className="search-drawer__section">
                      <div className="search-drawer__section-title">✨ {t("search.active")}</div>
                      {results.active.map(n => renderItem(n, "active"))}
                    </div>
                  )}
                  {results.stashed.length > 0 && (
                    <div className="search-drawer__section">
                      <div className="search-drawer__section-title">🐹 {t("search.stashed")}</div>
                      {results.stashed.map(n => renderItem(n, "stashed"))}
                    </div>
                  )}
                  {results.deleted.length > 0 && (
                    <div className="search-drawer__section">
                      <div className="search-drawer__section-title">🐐 {t("search.deleted")}</div>
                      {results.deleted.map(n => renderItem(n, "deleted"))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
