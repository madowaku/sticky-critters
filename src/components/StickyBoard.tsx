import React, { useState, useRef } from "react";
import type { StickyNote } from "../types";
import { StickyNoteCard } from "./StickyNoteCard";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  notes: StickyNote[];
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string, by: "goat" | "manual") => void;
  onUpdate: (id: string, partial: Partial<StickyNote>) => void;
  onSelect: (id: string, multi: boolean) => void;
  onRectangleSelect: (ids: string[], multi: boolean) => void;
  onClearSelection: () => void;
  onAddText: () => void;
  onAddSketch: () => void;
  onClipboardAdd: () => void;
  onOpenSettings: () => void;
  selectedNoteIds: string[];
  goatRef: React.RefObject<HTMLDivElement | null>;
  onNoteDragStart?: (size: { width: number; height: number }) => void;
  onNoteDragEnd?: () => void;
}

export function StickyBoard({ notes, onMove, onDelete, onUpdate, onSelect, onRectangleSelect, onClearSelection, onAddText, onAddSketch, onClipboardAdd, onOpenSettings, selectedNoteIds, goatRef, onNoteDragStart, onNoteDragEnd }: Props) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.button !== 0) return; // Left click only
    
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 6) {
      setIsDragging(true);
      setSelection({
        start: dragStartRef.current,
        end: { x: e.clientX, y: e.clientY }
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;

    if (!isDragging) {
      // It was a click
      onClearSelection();
    } else if (selection) {
      // It was a rectangle selection
      const rect = {
        left: Math.min(selection.start.x, selection.end.x),
        top: Math.min(selection.start.y, selection.end.y),
        right: Math.max(selection.start.x, selection.end.x),
        bottom: Math.max(selection.start.y, selection.end.y)
      };

      const selectedIds = notes
        .filter(note => {
          if (note.deletedAt || note.stashedAt) return false;
          
          const noteWidth = note.size === "wide" ? 360 : 280;
          // Heuristic height if not available
          const noteHeight = 160; 

          const noteRect = {
            left: note.x,
            top: note.y,
            right: note.x + noteWidth,
            bottom: note.y + noteHeight
          };

          return !(
            noteRect.left > rect.right ||
            noteRect.right < rect.left ||
            noteRect.top > rect.bottom ||
            noteRect.bottom < rect.top
          );
        })
        .map(n => n.id);

      onRectangleSelect(selectedIds, e.ctrlKey || e.metaKey);
    }

    dragStartRef.current = null;
    setIsDragging(false);
    setSelection(null);
  };
  return (
    <div 
      className="sticky-board" 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {notes.length === 0 && (
        <div className="empty-board" onPointerDown={(e) => e.stopPropagation()}>
          <div className="empty-board__eyebrow">{t("onboarding.eyebrow")}</div>
          <h2 className="empty-board__title">{t("onboarding.title")}</h2>
          <p className="empty-board__body">{t("onboarding.body")}</p>
          <div className="empty-board__actions">
            <button className="empty-board__btn empty-board__btn--primary" onClick={onAddText}>
              📝 {t("onboarding.addText")}
            </button>
            <button className="empty-board__btn" onClick={onClipboardAdd}>
              📋 {t("onboarding.fromClipboard")}
            </button>
            <button className="empty-board__btn" onClick={onAddSketch}>
              ✍️ {t("onboarding.addSketch")}
            </button>
            <button className="empty-board__btn" onClick={onOpenSettings}>
              ⚙️ {t("onboarding.openSettings")}
            </button>
          </div>
          <div className="empty-board__tips">
            <span>{t("onboarding.tipDrag")}</span>
            <span>{t("onboarding.tipRestore")}</span>
            <span>{t("onboarding.tipHotkey")}</span>
          </div>
        </div>
      )}

      {notes.map((note) => (
        <StickyNoteCard
          key={note.id}
          note={note}
          onMove={onMove}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onSelect={onSelect}
          onDragStart={onNoteDragStart}
          onDragEnd={onNoteDragEnd}
          isSelected={selectedNoteIds.includes(note.id)}
          goatRef={goatRef}
        />
      ))}

      {selection && (
        <div 
          className="selection-rect"
          style={{
            left: Math.min(selection.start.x, selection.end.x),
            top: Math.min(selection.start.y, selection.end.y),
            width: Math.abs(selection.end.x - selection.start.x),
            height: Math.abs(selection.end.y - selection.start.y),
          }}
        />
      )}
    </div>
  );
}
