import { useTranslation } from "../i18n/I18nContext";
import type { NoteColor } from "../types";

interface Props {
  selectedCount: number;
  onStash: () => void;
  onFeedGoat: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onAlignLeft: () => void;
  onAlignTop: () => void;
  onArrangeRow: () => void;
  onArrangeColumn: () => void;
  onDistribute: () => void;
  onUndoLayout: () => void;
  canUndoLayout: boolean;
  onColorChange: (color: NoteColor) => void;
  onGroup: () => void;
  onClear: () => void;
}

export function SelectionToolbar({
  selectedCount,
  onStash,
  onFeedGoat,
  onLock,
  onUnlock,
  onAlignLeft,
  onAlignTop,
  onArrangeRow,
  onArrangeColumn,
  onDistribute,
  onUndoLayout,
  canUndoLayout,
  onColorChange,
  onGroup,
  onClear,
}: Props) {
  const { t } = useTranslation();

  if (selectedCount < 2) return null;

  return (
    <div className="selection-toolbar">
      <div className="selection-toolbar__count">
        {t("selection.count").replace("{count}", selectedCount.toString())}
      </div>
      <div className="selection-toolbar__actions">
        <button className="selection-toolbar__btn" onClick={onStash} title={t("selection.stash")}>
          🐹 {t("selection.stash")}
        </button>
        <button className="selection-toolbar__btn selection-toolbar__btn--danger" onClick={onFeedGoat} title={t("selection.feedGoat")}>
          🐐 {t("selection.feedGoat")}
        </button>
        <button className="selection-toolbar__btn" onClick={onGroup} title={t("group.create")}>
          📦 {t("group.create")}
        </button>
        <button className="selection-toolbar__btn" onClick={onLock} title={t("selection.lock")}>
          🔒 {t("selection.lock")}
        </button>
        <button className="selection-toolbar__btn" onClick={onUnlock} title={t("selection.unlock")}>
          🔓 {t("selection.unlock")}
        </button>
        <div className="selection-toolbar__divider" />
        <button className="selection-toolbar__btn" onClick={onAlignLeft} title={t("align.left")}>
          ⬅️
        </button>
        <button className="selection-toolbar__btn" onClick={onAlignTop} title={t("align.top")}>
          ⬆️
        </button>
        <button className="selection-toolbar__btn" onClick={onArrangeRow} title={t("align.row")}>
          ↔️
        </button>
        <button className="selection-toolbar__btn" onClick={onArrangeColumn} title={t("align.column")}>
          ↕️
        </button>
        <button className="selection-toolbar__btn" onClick={onDistribute} title={t("align.distribute")}>
          ⠂⠂⠂
        </button>
        <button
          className="selection-toolbar__btn"
          onClick={onUndoLayout}
          disabled={!canUndoLayout}
          title={t("align.undoLayout")}
        >
          ↩️
        </button>
        <div className="selection-toolbar__divider" />
        <div className="selection-toolbar__colors">
          {(["yellow", "blue", "pink", "green", "gray", "purple"] as NoteColor[]).map(c => (
            <button
              key={c}
              className={`selection-toolbar__color-dot selection-toolbar__color-dot--${c}`}
              onClick={() => onColorChange(c)}
              title={t(`color.${c}`)}
            />
          ))}
        </div>
        <div className="selection-toolbar__divider" />
        <button className="selection-toolbar__btn selection-toolbar__btn--clear" onClick={onClear}>
          {t("selection.clear")}
        </button>
      </div>
    </div>
  );
}
