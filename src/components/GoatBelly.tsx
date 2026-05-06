import type { StickyNote } from "../types";
import { useTranslation } from "../i18n/I18nContext";
import { getBaseName } from "../lib/pathUtils";

interface Props {
  notes: StickyNote[];
  onRestore: (id: string) => void;
  onClose: () => void;
}

export function GoatBelly({ notes, onRestore, onClose }: Props) {
  const { t } = useTranslation();
  
  const deletedNotes = notes
    .filter(n => !!n.deletedAt)
    .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="goat-belly-overlay" onClick={onClose}>
      <div className="goat-belly" onClick={e => e.stopPropagation()}>
        <div className="goat-belly__header">
          <h3 className="goat-belly__title">🐐 {t("goatBelly.title")}</h3>
          <button className="goat-belly__close" onClick={onClose}>×</button>
        </div>
        
        <div className="goat-belly__content">
          {deletedNotes.length === 0 ? (
            <div className="goat-belly__empty">
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>🥗</div>
              {t("goatBelly.empty")}
            </div>
          ) : (
            <div className="goat-belly__list">
              {deletedNotes.map(note => (
                <div key={note.id} className={`goat-belly__item goat-belly__item--${note.color}`}>
                  <div className="goat-belly__item-header">
                    <span className="goat-belly__item-date">
                      {t("goatBelly.deletedAt")}: {formatDate(note.deletedAt!)}
                    </span>
                    <button 
                      className="goat-belly__restore-btn" 
                      onClick={() => onRestore(note.id)}
                    >
                      {t("goatBelly.restore")}
                    </button>
                  </div>
                  <div className="goat-belly__item-body">
                    {note.title && <div className="goat-belly__item-title">{note.title}</div>}
                    <div className="goat-belly__item-text">
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
