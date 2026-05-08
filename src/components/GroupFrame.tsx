import React, { useState } from "react";
import type { NoteGroup, NoteColor } from "../types";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  group: NoteGroup;
  onUpdate: (id: string, partial: Partial<NoteGroup>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onSelectNotes: (groupId: string) => void;
  onStashNotes: (groupId: string) => void;
  onLockNotes: (groupId: string, locked: boolean) => void;
}

export function GroupFrame({ group, onUpdate, onDelete, onMove, onSelectNotes, onStashNotes, onLockNotes }: Props) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showColors, setShowColors] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (isGroupControlTarget(e.target)) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    onMove(group.id, dx, dy);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const stopControlPointer = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const stopControlClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = window.prompt(t("group.rename"), group.title);
    if (next !== null) {
      onUpdate(group.id, { title: next || t("group.defaultTitle") });
    }
  };

  const toggleCollapse = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onUpdate(group.id, { collapsed: !group.collapsed });
  };

  const handleColorChange = (color: NoteColor, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onUpdate(group.id, { color });
    setShowColors(false);
  };

  const handleToggleColors = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowColors((next) => !next);
  };

  const colorClass = group.color ? `group-frame--${group.color}` : "group-frame--gray";

  if (group.collapsed) {
    return (
      <div 
        className={`group-frame group-frame--collapsed ${colorClass}`}
        style={{ left: group.x, top: group.y }}
      >
        <div className="group-frame__header" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
          <button className="group-frame__toggle" onPointerDown={stopControlPointer} onClick={toggleCollapse}>
            ▶️
          </button>
          <span className="group-frame__title" title={group.title}>{group.title}</span>
          <div className="group-frame__actions" onPointerDown={stopControlPointer} onClick={stopControlClick}>
            <button className="group-frame__btn" onClick={handleToggleColors} title={t("group.colorChange")}>
              🎨
            </button>
            <button className="group-frame__btn" onClick={() => onSelectNotes(group.id)} title={t("group.selectNotes")}>
              🔍
            </button>
            <button className="group-frame__btn" onClick={() => onDelete(group.id)} title={t("group.ungroup")}>
              🔓
            </button>
          </div>
        </div>
        {showColors && (
          <div className="group-frame__colors" onPointerDown={stopControlPointer} onClick={stopControlClick}>
            {(["yellow", "blue", "pink", "green", "gray", "purple"] as NoteColor[]).map(c => (
              <div 
                key={c} 
                className={`group-frame__color-dot group-frame__color-dot--${c}`}
                onClick={(e) => handleColorChange(c, e)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`group-frame ${colorClass}`}
      style={{
        left: group.x,
        top: group.y,
        width: group.width,
        height: group.height,
      }}
    >
      <div className="group-frame__header" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        <button className="group-frame__toggle" onPointerDown={stopControlPointer} onClick={toggleCollapse}>
          ▼
        </button>
        <span className="group-frame__title" onDoubleClick={handleRename}>
          {group.title}
        </span>
        <div className="group-frame__actions" onPointerDown={stopControlPointer} onClick={stopControlClick}>
          <button className="group-frame__btn" onClick={handleToggleColors} title={t("group.colorChange")}>
            🎨
          </button>
          <button className="group-frame__btn" onClick={() => onSelectNotes(group.id)} title={t("group.selectNotes")}>
            🔍
          </button>
          <button className="group-frame__btn" onClick={() => onStashNotes(group.id)} title={t("group.stashNotes")}>
            🐹
          </button>
          <button className="group-frame__btn" onClick={() => onLockNotes(group.id, true)} title={t("group.lockNotes")}>
            🔒
          </button>
          <button className="group-frame__btn" onClick={() => onLockNotes(group.id, false)} title={t("group.unlockNotes")}>
            🔓
          </button>
          <button className="group-frame__btn" onClick={handleRename} title={t("group.rename")}>
            ✏️
          </button>
          <button className="group-frame__btn" onClick={() => onDelete(group.id)} title={t("group.ungroup")}>
            ✖️
          </button>
        </div>
      </div>
      <div className="group-frame__body" />
      {showColors && (
        <div className="group-frame__colors" onPointerDown={stopControlPointer} onClick={stopControlClick}>
          {(["yellow", "blue", "pink", "green", "gray", "purple"] as NoteColor[]).map(c => (
            <div 
              key={c} 
              className={`group-frame__color-dot group-frame__color-dot--${c}`}
              onClick={(e) => handleColorChange(c, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function isGroupControlTarget(target: EventTarget): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("button, .group-frame__actions, .group-frame__colors"));
}
