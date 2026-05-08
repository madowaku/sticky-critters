export type NoteKind = "plain" | "code" | "url" | "file" | "folder" | "image" | "sketch" | "bundle";
export type NoteColor = "yellow" | "blue" | "pink" | "green" | "gray" | "purple";
export type NoteSize = "normal" | "wide";

export type BundleItem = {
  id: string;
  path: string;
  name: string;
  kind: "file" | "folder" | "image" | "unknown";
  extension?: string;
};

export type InkPoint = {
  x: number;
  y: number;
  pressure?: number;
  t?: number;
};

export type InkStroke = {
  id: string;
  tool: "pen" | "eraser";
  color: string;
  width: number;
  points: InkPoint[];
};

export type StickyNote = {
  id: string;
  kind: NoteKind;
  title?: string;
  body: string;
  path?: string;
  color: NoteColor;
  size: NoteSize;
  x: number;
  y: number;
  pinned: boolean;
  collapsed: boolean;
  copiedAt?: string;
  openedAt?: string;
  lastFocusedAt?: string;
  lastInteractedAt?: string;
  inkStrokes?: InkStroke[];
  sketchBackground?: "plain" | "grid" | "lined";
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedBy?: "goat" | "manual";
  alarmAt?: string;
  snoozedUntil?: string;
  completedAt?: string;
  expiresAt?: string;
  reviewAfter?: string;
  restoredAt?: string;
  stashedAt?: string;
  unstashedAt?: string;
  locked?: boolean;
  previewUrl?: string;
  groupId?: string;
  bundleItems?: BundleItem[];
};

export type NoteGroup = {
  id: string;
  title: string;
  color?: NoteColor;
  collapsed: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
};
