import React, { useMemo } from "react";
import type { StickyNote, NoteGroup } from "../types";
import { useTranslation } from "../i18n/I18nContext";

interface Props {
  notes: StickyNote[];
  groups: NoteGroup[];
  onJump: (x: number, y: number) => void;
  onClose: () => void;
}

export function StickyMap({ notes, groups, onJump, onClose }: Props) {
  const { t } = useTranslation();

  const bounds = useMemo(() => {
    if (notes.length === 0 && groups.length === 0) return null;

    const allItems = [
      ...notes.map(n => ({ x: n.x, y: n.y, w: n.size === "wide" ? 360 : 280, h: 160 })),
      ...groups.map(g => ({ x: g.x, y: g.y, w: g.width, h: g.height }))
    ];

    const minX = Math.min(...allItems.map(i => i.x));
    const minY = Math.min(...allItems.map(i => i.y));
    const maxX = Math.max(...allItems.map(i => i.x + i.w));
    const maxY = Math.max(...allItems.map(i => i.y + i.h));

    const margin = 120;
    return {
      minX: minX - margin,
      minY: minY - margin,
      maxX: maxX + margin,
      maxY: maxY + margin,
      width: (maxX - minX) + margin * 2,
      height: (maxY - minY) + margin * 2
    };
  }, [notes, groups]);

  const mapWidth = 260;
  const mapHeight = 180;

  const scale = useMemo(() => {
    if (!bounds) return 1;
    const sX = mapWidth / bounds.width;
    const sY = mapHeight / bounds.height;
    return Math.min(sX, sY, 0.5); // Max scale 0.5 to keep things small
  }, [bounds]);

  const worldToMap = (x: number, y: number) => {
    if (!bounds) return { x: 0, y: 0 };
    return {
      x: (x - bounds.minX) * scale + (mapWidth - bounds.width * scale) / 2,
      y: (y - bounds.minY) * scale + (mapHeight - bounds.height * scale) / 2
    };
  };

  const mapToWorld = (mx: number, my: number) => {
    if (!bounds) return { x: 0, y: 0 };
    const offsetX = (mapWidth - bounds.width * scale) / 2;
    const offsetY = (mapHeight - bounds.height * scale) / 2;
    return {
      x: (mx - offsetX) / scale + bounds.minX,
      y: (my - offsetY) / scale + bounds.minY
    };
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const world = mapToWorld(mx, my);
    onJump(world.x, world.y);
  };

  return (
    <div className="sticky-map">
      <div className="sticky-map__header">
        <span className="sticky-map__title">🗺️ {t("map.title")}</span>
        <button className="sticky-map__close" onClick={onClose}>×</button>
      </div>
      <div className="sticky-map__content" onClick={handleMapClick}>
        {!bounds ? (
          <div className="sticky-map__empty">{t("map.empty")}</div>
        ) : (
          <>
            {groups.map(g => {
              const pos = worldToMap(g.x, g.y);
              return (
                <div 
                  key={g.id}
                  className={`sticky-map__item sticky-map__item--group ${g.color ? `sticky-map__item--${g.color}` : ""}`}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: Math.max(8, g.width * scale),
                    height: Math.max(8, g.height * scale),
                  }}
                />
              );
            })}
            {notes.map(n => {
              const pos = worldToMap(n.x, n.y);
              const w = n.size === "wide" ? 360 : 280;
              return (
                <div 
                  key={n.id}
                  className={`sticky-map__item sticky-map__item--note sticky-map__item--${n.color} ${n.locked ? "sticky-map__item--locked" : ""}`}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: Math.max(4, w * scale),
                    height: Math.max(4, 160 * scale),
                  }}
                />
              );
            })}
            {/* Viewport representation */}
            <div 
              className="sticky-map__viewport"
              style={{
                ...worldToMap(0, 0),
                width: window.innerWidth * scale,
                height: window.innerHeight * scale,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
