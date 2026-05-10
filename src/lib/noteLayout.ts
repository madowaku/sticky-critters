import type { NoteCardSize, StickyNote } from "../types";

export type NoteDimensions = {
  width: number;
  height: number;
};

const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;

export function getDefaultNoteDimensions(note: StickyNote, cardSize: NoteCardSize = "compact"): NoteDimensions {
  const width = note.size === "wide" || note.kind === "bundle" ? 360 : 280;

  if (cardSize === "mini") {
    switch (note.kind) {
      case "bundle":
        return { width: 240, height: 150 };
      case "image":
        return { width: 220, height: 150 };
      case "sketch":
        return { width: 240, height: 180 };
      default:
        return { width: note.size === "wide" ? 240 : 190, height: 100 };
    }
  }

  if (cardSize === "normal") {
    switch (note.kind) {
      case "bundle":
        return { width: 380, height: 240 };
      case "image":
        return { width: 320, height: 240 };
      case "sketch":
        return { width: Math.max(width, 300), height: 320 };
      default:
        return { width: note.size === "wide" ? 380 : 300, height: 180 };
    }
  }

  switch (note.kind) {
    case "bundle":
      return { width, height: 220 };
    case "image":
      return { width, height: 220 };
    case "sketch":
      return { width: Math.max(width, 280), height: 300 };
    default:
      return { width, height: 160 };
  }
}

export function getMinNoteDimensions(note: StickyNote): NoteDimensions {
  switch (note.kind) {
    case "bundle":
      return { width: 220, height: 140 };
    case "image":
      return { width: 220, height: 150 };
    case "sketch":
      return { width: 240, height: 180 };
    default:
      return { width: 180, height: 90 };
  }
}

export function getNoteDimensions(note: StickyNote, cardSize: NoteCardSize = "compact"): NoteDimensions {
  const fallback = getDefaultNoteDimensions(note, cardSize);
  return {
    width: note.width ?? fallback.width,
    height: note.height ?? fallback.height,
  };
}

export function clampNoteDimensions(note: StickyNote, width: number, height: number): NoteDimensions {
  const min = getMinNoteDimensions(note);
  return {
    width: Math.min(MAX_WIDTH, Math.max(min.width, Math.round(width))),
    height: Math.min(MAX_HEIGHT, Math.max(min.height, Math.round(height))),
  };
}
