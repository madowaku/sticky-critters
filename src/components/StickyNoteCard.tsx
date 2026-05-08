import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import type { BundleItem, StickyNote } from "../types";
import { copyToClipboard } from "../lib/clipboard";
import {
  openUrl,
  canOpenPath,
  canOpenFolderPath,
  openFilePath,
  openFolderPath,
} from "../lib/openers";
import { getBaseName, isDangerousExecutable } from "../lib/pathUtils";
import { useTranslation } from "../i18n/I18nContext";
import { getImagePreviewSrc } from "../lib/imagePreview";
import { SketchCanvas } from "./SketchCanvas";

interface Props {
  note: StickyNote;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string, by: "goat" | "manual") => void;
  onUpdate: (id: string, partial: Partial<StickyNote>) => void;
  onSelect: (id: string, multi: boolean) => void;
  onDragStart?: (size: { width: number; height: number }) => void;
  onDragEnd?: () => void;
  isSelected: boolean;
  goatRef: React.RefObject<HTMLDivElement | null>;
}

export function StickyNoteCard({
  note,
  onMove,
  onDelete,
  onUpdate,
  onSelect,
  onDragStart,
  onDragEnd,
  isSelected,
  goatRef,
}: Props) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isOverGoat, setIsOverGoat] = useState(false);
  const [alarmPanelOpen, setAlarmPanelOpen] = useState(false);
  const [alarmTime, setAlarmTime] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(note.body);
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1280 : window.innerWidth,
    height: typeof window === "undefined" ? 720 : window.innerHeight,
  }));
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const desiredWidth = note.size === "wide" ? 360 : 280;
  const noteWidth = Math.min(desiredWidth, Math.max(220, viewport.width - 24));
  const minX = 8;
  const minY = viewport.height < 520 ? 84 : 92;
  const maxX = Math.max(minX, viewport.width - noteWidth - 8);
  const maxY = Math.max(minY, viewport.height - 132);
  const displayX = Math.min(Math.max(note.x, minX), maxX);
  const displayY = Math.min(Math.max(note.y, minY), maxY);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      // Don't drag when interacting with controls.
      if (target.closest("button, textarea, input, .sticky-note__menu")) return;
      // Sketch notes reserve the body for drawing; move them from the header.
      if (note.kind === "sketch" && !target.closest(".sticky-note__header")) return;
      // Don't drag if locked
      if (note.locked) return;

      // Select on click
      onSelect(note.id, e.ctrlKey || e.metaKey);

      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      onDragStart?.({ width: rect.width, height: rect.height });

      card.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragOffset.current = { x: e.clientX - displayX, y: e.clientY - displayY };
      e.preventDefault();
    },
    [displayX, displayY, note.id, note.kind, note.locked, onDragStart, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      onMove(note.id, newX, newY);

      // Check goat overlap
      if (goatRef.current) {
        const goatRect = goatRef.current.getBoundingClientRect();
        const overGoat =
          e.clientX >= goatRect.left &&
          e.clientX <= goatRect.right &&
          e.clientY >= goatRect.top &&
          e.clientY <= goatRect.bottom;
        setIsOverGoat(overGoat);
      }
    },
    [isDragging, note.id, onMove, goatRef]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      setIsOverGoat(false);

      const card = cardRef.current;
      if (card) {
        card.releasePointerCapture(e.pointerId);
      }

      // Check if dropped on goat
      if (goatRef.current) {
        const goatRect = goatRef.current.getBoundingClientRect();
        if (
          e.clientX >= goatRect.left &&
          e.clientX <= goatRect.right &&
          e.clientY >= goatRect.top &&
          e.clientY <= goatRect.bottom
        ) {
          onDelete(note.id, "goat");
        }
      }
      onDragEnd?.();
    },
    [isDragging, note.id, onDelete, onDragEnd, goatRef]
  );

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyFeedback(true);
      onUpdate(note.id, { lastInteractedAt: new Date().toISOString() });
    }
  };

  useEffect(() => {
    if (!copyFeedback) return;
    const t = setTimeout(() => setCopyFeedback(false), 1200);
    return () => clearTimeout(t);
  }, [copyFeedback]);

  const toggleSize = () => {
    onUpdate(note.id, { size: note.size === "wide" ? "normal" : "wide" });
  };

  const isFileOpen = note.kind === "file" && canOpenPath(note.path);
  const isFolderOpen = note.kind === "folder" && canOpenFolderPath(note.path);
  const isImageOpen = note.kind === "image" && canOpenPath(note.path);
  const bundleItems = note.bundleItems || [];

  const kindHeader: Record<string, string> = {
    plain: `📝 ${t("note.memo")}`,
    code: `💻 ${t("note.codeSnippet")}`,
    url: `🐦 ${t("note.url")}`,
    file: `🐦 ${t("note.file")}`,
    folder: `🕳️ ${t("note.folder")}`,
    image: `🖼️ ${t("note.image")}`,
    sketch: `✍️ ${t("note.sketch")}`,
    bundle: `📦 ${t("note.bundle")}`,
  };

  const handleAlarmSave = () => {
    if (alarmTime) {
      onUpdate(note.id, { 
        alarmAt: new Date(alarmTime).toISOString(),
        completedAt: undefined,
        snoozedUntil: undefined 
      });
    }
    setAlarmPanelOpen(false);
  };

  const handleAlarmClear = () => {
    onUpdate(note.id, { alarmAt: undefined, snoozedUntil: undefined, completedAt: undefined });
    setAlarmPanelOpen(false);
  };

  const formatAlarmDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const isOverdue = note.alarmAt && !note.completedAt && new Date(note.alarmAt) < new Date();
  const currentAlarmDisplay = note.snoozedUntil || note.alarmAt;

  const toggleTodayOnly = () => {
    if (note.expiresAt) {
      onUpdate(note.id, { expiresAt: undefined, reviewAfter: undefined });
    } else {
      const expires = new Date();
      expires.setHours(23, 59, 59, 999);
      const review = new Date();
      review.setDate(review.getDate() + 1);
      review.setHours(9, 0, 0, 0);
      onUpdate(note.id, { expiresAt: expires.toISOString(), reviewAfter: review.toISOString() });
    }
  };

  const imagePreviewSrc = useMemo(
    () => getImagePreviewSrc(note.path, note.previewUrl),
    [note.path, note.previewUrl]
  );
  const imagePreviewFailed = !!imagePreviewSrc && failedImageSrc === imagePreviewSrc;
  const canEditBody = (note.kind === "plain" || note.kind === "code") && !note.locked;

  const startEditing = () => {
    if (!canEditBody) return;
    setEditBody(note.body);
    setEditing(true);
    setMenuOpen(false);
  };

  const saveEdit = () => {
    if (!canEditBody) return;
    onUpdate(note.id, { body: editBody });
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditBody(note.body);
    setEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const updateChecklistLine = (lineIndex: number, done: boolean) => {
    if (note.kind !== "plain" || note.locked) return;
    const lines = note.body.split("\n");
    const parsed = parseChecklistLine(lines[lineIndex]);
    if (!parsed) return;
    lines[lineIndex] = `- [${done ? "x" : " "}] ${parsed.text}`;
    onUpdate(note.id, { body: lines.join("\n") });
  };

  const handleOpenBundleItem = async (item: BundleItem) => {
    if (item.kind === "folder") {
      await openFolderPath(item.path);
      onUpdate(note.id, { lastInteractedAt: new Date().toISOString() });
      return;
    }

    if (item.kind === "file" || item.kind === "image") {
      if (isDangerousExecutable(item.path || item.name)) {
        console.warn("[bundle] BLOCKED: dangerous executable:", item.path);
        return;
      }
      await openFilePath(item.path);
      onUpdate(note.id, { lastInteractedAt: new Date().toISOString() });
    }
  };

  const canOpenBundleItem = (item: BundleItem) => {
    if (item.kind === "folder") return canOpenFolderPath(item.path);
    if (item.kind === "file" || item.kind === "image") return canOpenPath(item.path);
    return false;
  };

  const mainActions = (
    <>
      {note.kind === "code" && (
        <button
          className="sticky-note__action-btn"
          onClick={() => handleCopy(note.body)}
        >
          📋 {t("action.copy")}
        </button>
      )}
      {note.kind === "url" && (
        <>
          <button
            className="sticky-note__action-btn"
            onClick={() => {
              openUrl(note.body);
              onUpdate(note.id, { lastInteractedAt: new Date().toISOString() });
            }}
          >
            🌐 {t("action.open")}
          </button>
          <button
            className="sticky-note__action-btn"
            onClick={() => handleCopy(note.body)}
          >
            📋 {t("action.copy")}
          </button>
        </>
      )}
      {note.kind === "file" && (
        <>
          <button
            className="sticky-note__action-btn"
            onClick={() => {
              openFilePath(note.path);
              onUpdate(note.id, { lastInteractedAt: new Date().toISOString() });
            }}
            disabled={!isFileOpen}
            title={
              isDangerousExecutable(note.path || "")
                ? "Blocked: dangerous executable"
                : !isFileOpen
                  ? "Not available in browser mode"
                  : "Open file"
            }
          >
            📂 {t("action.open")}
          </button>
          <button
            className="sticky-note__action-btn"
            onClick={() => handleCopy(note.path || note.body)}
          >
            📋 {t("action.copyPath")}
          </button>
        </>
      )}
      {note.kind === "folder" && (
        <>
          <button
            className="sticky-note__action-btn"
            onClick={() => {
              openFolderPath(note.path);
              onUpdate(note.id, { lastInteractedAt: new Date().toISOString() });
            }}
            disabled={!isFolderOpen}
            title={!isFolderOpen ? "Not available in browser mode" : "Open folder"}
          >
            📂 {t("action.open")}
          </button>
          <button
            className="sticky-note__action-btn"
            onClick={() => handleCopy(note.path || note.body)}
          >
            📋 {t("action.copyPath")}
          </button>
        </>
      )}
      {note.kind === "image" && (
        <>
          <button
            className="sticky-note__action-btn"
            onClick={() => {
              openFilePath(note.path);
              onUpdate(note.id, { lastInteractedAt: new Date().toISOString() });
            }}
            disabled={!isImageOpen}
            title={!isImageOpen ? t("image.previewUnavailable") : t("image.open")}
          >
            📂 {t("image.open")}
          </button>
          <button
            className="sticky-note__action-btn"
            onClick={() => handleCopy(note.path || note.body)}
          >
            📋 {t("image.copyPath")}
          </button>
        </>
      )}
      {note.kind === "bundle" && (
        <button
          className="sticky-note__action-btn"
          onClick={() => handleCopy(bundleItems.map((item) => item.path).join("\n"))}
          disabled={bundleItems.length === 0}
        >
          📋 {t("bundle.copyAllPaths")}
        </button>
      )}
    </>
  );

  return (
    <div
      ref={cardRef}
      className={`sticky-note sticky-note--${note.color} sticky-note--${note.kind} sticky-note--${note.size} ${isDragging ? "sticky-note--dragging" : ""} ${isOverGoat ? "sticky-note--over-goat" : ""} ${note.locked ? "sticky-note--locked" : ""} ${isSelected ? "sticky-note--selected" : ""}`}
      style={{
        width: noteWidth,
        minHeight: note.kind === "bundle" ? 220 : note.kind === "sketch" ? 120 : 96,
        position: "absolute",
        left: displayX,
        top: displayY,
        touchAction: "none",
        zIndex: isDragging ? 9999 : isSelected ? 5000 : 1,
      }}
      data-dragging={isDragging}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      title={note.locked ? t("lock.lockedHint") : undefined}
    >
      {/* Header */}
      <div className="sticky-note__header" title={note.locked ? t("lock.lockedHint") : t("note.dragHandle")}>
        {note.locked && <span className="sticky-note__lock-badge" title={t("lock.lockedHint")}>🔒</span>}
        <span className="sticky-note__kind-emoji">{kindHeader[note.kind]}</span>
        {!note.locked && <span className="sticky-note__drag-grip" aria-hidden="true">⠿</span>}
        {getDisplayTitle(note) && (
          <span className="sticky-note__title">{getDisplayTitle(note)}</span>
        )}
        <div className="sticky-note__header-actions">
          {canEditBody && (
            <button
              className="sticky-note__btn"
              onClick={startEditing}
              title={t("note.edit")}
            >
              ✎
            </button>
          )}
          <button
            className="sticky-note__btn"
            onClick={() => setMenuOpen((prev) => !prev)}
            title={t("note.more")}
            aria-expanded={menuOpen}
          >
            …
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sticky-note__menu" onPointerDown={(e) => e.stopPropagation()}>
          {canEditBody && (
            <button onClick={startEditing}>✎ {t("note.edit")}</button>
          )}
          <button onClick={toggleSize}>
            {note.size === "wide" ? "▫" : "▪"} {note.size === "wide" ? t("note.normalSize") : t("note.wideSize")}
          </button>
          <button onClick={() => onUpdate(note.id, { locked: !note.locked })}>
            {note.locked ? "🔒" : "🔓"} {note.locked ? t("lock.unlock") : t("lock.lock")}
          </button>
          <button
            onClick={() => {
              if (note.alarmAt) {
                const d = new Date(note.alarmAt);
                const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                setAlarmTime(localIso);
              }
              setAlarmPanelOpen(true);
              setMenuOpen(false);
            }}
            disabled={note.locked}
          >
            🐔 {t("alarm.set")}
          </button>
          <button onClick={toggleTodayOnly} disabled={note.locked} title={t("temporary.todayOnlyHint")}>
            📅 {t("temporary.todayOnly")}
          </button>
          <button
            onClick={() => onUpdate(note.id, { stashedAt: new Date().toISOString() })}
            disabled={note.locked}
          >
            🐹 {t("stash.stash")}
          </button>
          <button
            className="sticky-note__menu-danger"
            onClick={() => onDelete(note.id, "manual")}
            disabled={note.locked}
          >
            × {t("action.delete")}
          </button>
        </div>
      )}

      {/* Body */}
      <div className="sticky-note__body">
        {editing && (note.kind === "plain" || note.kind === "code") && (
          <div className="sticky-note__editor">
            <textarea
              className="sticky-note__textarea"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={handleEditKeyDown}
              autoFocus
            />
            <div className="sticky-note__edit-hint">{t("note.editHint")}</div>
            <div className="sticky-note__edit-actions">
              <button className="sticky-note__action-btn" onClick={cancelEdit}>
                {t("note.cancel")}
              </button>
              <button className="sticky-note__action-btn sticky-note__action-btn--active" onClick={saveEdit}>
                {t("note.save")}
              </button>
            </div>
          </div>
        )}
        {!editing && note.kind === "code" && (
          <pre className="sticky-note__code">{note.body}</pre>
        )}
        {!editing && note.kind === "url" && (
          <div className="sticky-note__url">{note.body}</div>
        )}
        {!editing && note.kind === "file" && (
          <div className="sticky-note__file">
            <span className="sticky-note__file-name">
              {getBaseName(note.path || note.body)}
            </span>
            {note.path && (
              <span className="sticky-note__file-path">{note.path}</span>
            )}
          </div>
        )}
        {!editing && note.kind === "folder" && (
          <div className="sticky-note__file">
            <span className="sticky-note__file-name">
              {getBaseName(note.path || note.body)}
            </span>
            {note.path && (
              <span className="sticky-note__file-path">{note.path}</span>
            )}
          </div>
        )}
        {!editing && note.kind === "image" && (
          <div className="sticky-note__image-container">
            {imagePreviewSrc && !imagePreviewFailed ? (
              <img 
                src={imagePreviewSrc}
                alt={note.title} 
                className="sticky-note__image"
                draggable={false}
                onError={(e) => {
                  console.warn("[imagePreview] Failed to load image preview", {
                    noteId: note.id,
                    path: note.path,
                    previewUrl: note.previewUrl,
                    src: imagePreviewSrc,
                    error: e.currentTarget.currentSrc,
                  });
                  setFailedImageSrc(imagePreviewSrc);
                }}
              />
            ) : null}
            <div className={`sticky-note__image-placeholder ${imagePreviewSrc && !imagePreviewFailed ? "hidden" : ""}`}>
              🖼️ {t("image.previewUnavailable")}
            </div>
          </div>
        )}
        {!editing && note.kind === "bundle" && (
          <div className="sticky-note__bundle">
            <div className="sticky-note__bundle-count">
              {t("bundle.itemCount").replace("{count}", String(bundleItems.length))}
            </div>
            {bundleItems.length === 0 ? (
              <div className="sticky-note__bundle-empty">{t("bundle.empty")}</div>
            ) : (
              <div className="sticky-note__bundle-list">
                {bundleItems.map((item) => {
                  const blocked = item.kind !== "folder" && isDangerousExecutable(item.path || item.name);
                  const canOpen = canOpenBundleItem(item) && !blocked;
                  return (
                    <div key={item.id} className="sticky-note__bundle-item">
                      <span className="sticky-note__bundle-icon" aria-hidden="true">
                        {getBundleItemIcon(item.kind)}
                      </span>
                      <div className="sticky-note__bundle-main">
                        <div className="sticky-note__bundle-name">{item.name || getBaseName(item.path)}</div>
                        <div className="sticky-note__bundle-path" title={item.path}>
                          {shortenPath(item.path)}
                        </div>
                      </div>
                      <button
                        className="sticky-note__bundle-open"
                        onClick={() => handleOpenBundleItem(item)}
                        disabled={!canOpen}
                        title={blocked ? t("bundle.dangerousBlocked") : t("bundle.open")}
                      >
                        {t("bundle.open")}
                      </button>
                      <button
                        className="sticky-note__bundle-copy"
                        onClick={() => handleCopy(item.path)}
                        title={t("action.copyPath")}
                      >
                        📋
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {!editing && note.kind === "plain" && (
          <div className="sticky-note__text">
            {note.body.split("\n").map((line, index) => (
              <PlainTextLine
                key={`${index}-${line}`}
                line={line}
                lineIndex={index}
                locked={!!note.locked}
                onToggle={updateChecklistLine}
                doneLabel={t("checklist.done")}
                undoLabel={t("checklist.undo")}
              />
            ))}
          </div>
        )}
        {!editing && note.kind === "sketch" && (
          <SketchCanvas note={note} onUpdate={onUpdate} locked={note.locked} />
        )}
      </div>

      {/* Alarm Badge */}
      {currentAlarmDisplay && (
        <div className={`sticky-note__alarm-badge ${isOverdue ? "sticky-note__alarm-badge--overdue" : ""} ${note.completedAt ? "sticky-note__alarm-badge--done" : ""}`}>
          🐔 {formatAlarmDate(currentAlarmDisplay)}
        </div>
      )}

      {/* Today Only Badge */}
      {note.expiresAt && (
        <div className="sticky-note__today-badge">
          📅 {t("temporary.badge")}
        </div>
      )}

      {/* Actions */}
      <div className="sticky-note__actions">
        {!editing && mainActions}

        {/* Copy feedback */}
        {copyFeedback && (
          <span className="sticky-note__copy-feedback">{t("copy.done")}</span>
        )}
      </div>

      {/* Alarm Panel Overlay */}
      {alarmPanelOpen && (
        <div className="sticky-note__alarm-panel" onPointerDown={e => e.stopPropagation()}>
          <div className="sticky-note__alarm-panel-header">
            <span>🐔 {t("alarm.set")}</span>
            <button onClick={() => setAlarmPanelOpen(false)}>×</button>
          </div>
          <input
            type="datetime-local"
            className="sticky-note__alarm-panel-input"
            value={alarmTime}
            onChange={e => setAlarmTime(e.target.value)}
          />
          <div className="sticky-note__alarm-panel-footer">
            <button className="sticky-note__alarm-panel-btn sticky-note__alarm-panel-btn--clear" onClick={handleAlarmClear}>
              {t("alarm.clear")}
            </button>
            <button className="sticky-note__alarm-panel-btn sticky-note__alarm-panel-btn--save" onClick={handleAlarmSave}>
              {t("alarm.save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getDisplayTitle(note: StickyNote): string {
  if (note.title) return note.title;

  switch (note.kind) {
    case "url": {
      try {
        const url = new URL(note.body);
        return url.hostname;
      } catch {
        return "";
      }
    }
    case "file":
    case "folder":
    case "image":
      return getBaseName(note.path || note.body);
    case "bundle":
      return (note.bundleItems?.[0]?.name || note.body.split("\n")[0] || "").trim();
    case "code":
    case "plain":
    default:
      return "";
  }
}

function getBundleItemIcon(kind: BundleItem["kind"]): string {
  switch (kind) {
    case "folder":
      return "📁";
    case "image":
      return "🖼️";
    case "file":
      return "📄";
    default:
      return "❔";
  }
}

function shortenPath(path: string): string {
  if (!path) return "";
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 3) return path;
  return `.../${parts.slice(-3).join("/")}`;
}

type ChecklistLine = {
  done: boolean;
  text: string;
};

function parseChecklistLine(line: string): ChecklistLine | null {
  const checked = line.match(/^\s*[-*・]\s*\[(x|X| )\]\s+(.+)$/);
  if (checked) {
    return { done: checked[1].toLowerCase() === "x", text: checked[2] };
  }

  const bullet = line.match(/^\s*[-*・]\s+(.+)$/);
  if (bullet) {
    return { done: false, text: bullet[1] };
  }

  return null;
}

function PlainTextLine({
  line,
  lineIndex,
  locked,
  onToggle,
  doneLabel,
  undoLabel,
}: {
  line: string;
  lineIndex: number;
  locked: boolean;
  onToggle: (lineIndex: number, done: boolean) => void;
  doneLabel: string;
  undoLabel: string;
}) {
  const parsed = parseChecklistLine(line);

  if (!parsed) {
    return <div className="sticky-note__text-line">{line || "\u00a0"}</div>;
  }

  return (
    <div className={`sticky-note__checkline ${parsed.done ? "sticky-note__checkline--done" : ""}`}>
      <button
        className="sticky-note__check-btn"
        disabled={locked}
        onClick={() => onToggle(lineIndex, !parsed.done)}
        title={parsed.done ? undoLabel : doneLabel}
        aria-label={parsed.done ? undoLabel : doneLabel}
      >
        {parsed.done ? "↶" : "✓"}
      </button>
      <span className="sticky-note__check-text">{parsed.text}</span>
    </div>
  );
}
