import type { StickyNote } from "../types";
import { useTranslation } from "../i18n/I18nContext";
import { getBaseName } from "../lib/pathUtils";

interface Props {
  notes: StickyNote[];
  onRestore: (id: string) => void;
  onFeedGoat: (id: string) => void;
  onClose: () => void;
}

export function StashDrawer({ notes, onRestore, onFeedGoat, onClose }: Props) {
  const { t } = useTranslation();
  
  const stashedNotes = notes
    .filter(n => !!n.stashedAt && !n.deletedAt)
    .sort((a, b) => new Date(b.stashedAt!).getTime() - new Date(a.stashedAt!).getTime());

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="stash-drawer-overlay" onClick={onClose}>
      <div className="stash-drawer" onClick={e => e.stopPropagation()}>
        <div className="stash-drawer__header">
          <h3 className="stash-drawer__title">🐹 {t("stash.title")}</h3>
          <button className="stash-drawer__close" onClick={onClose}>×</button>
        </div>
        
        <div className="stash-drawer__content">
          {stashedNotes.length === 0 ? (
            <div className="stash-drawer__empty">
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>🥜</div>
              {t("stash.empty")}
            </div>
          ) : (
            <div className="stash-drawer__list">
              {stashedNotes.map(note => (
                <div key={note.id} className={`stash-drawer__item stash-drawer__item--${note.color}`}>
                  <div className="stash-drawer__item-header">
                    <span className="stash-drawer__item-date">
                      {t("stash.stashedAt")}: {formatDate(note.stashedAt!)}
                      {note.locked && <span style={{ marginLeft: "6px" }} title={t("lock.lockedHint")}>🔒</span>}
                    </span>
                    <div className="stash-drawer__item-actions">
                      <button 
                        className="stash-drawer__btn stash-drawer__btn--restore" 
                        onClick={() => onRestore(note.id)}
                      >
                        {t("stash.restore")}
                      </button>
                      {!note.locked && (
                        <button 
                          className="stash-drawer__btn stash-drawer__btn--goat" 
                          onClick={() => onFeedGoat(note.id)}
                          title={t("stash.feedGoat")}
                        >
                          🐐
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="stash-drawer__item-body">
                    {note.title && <div className="stash-drawer__item-title">{note.title}</div>}
                    <div className="stash-drawer__item-text">
                      {note.kind === "file" || note.kind === "folder" || note.kind === "image"
                        ? getBaseName(note.path || note.body)
                        : note.body.slice(0, 100) + (note.body.length > 100 ? "..." : "")
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
