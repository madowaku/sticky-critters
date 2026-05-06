import type { StickyNote, NoteKind, NoteColor, NoteSize, NoteGroup } from "../types";
import { isUrl } from "./noteDetection";

const STORAGE_KEY = "sticky-critters-notes";
const SETTINGS_KEY = "sticky-critters-locale";

export interface WindowSettings {
  width: number;
  height: number;
  x: number;
  y: number;
}

export type DisplayMode = "board" | "desktop";
export type InteractionMode = "edit" | "passThrough";
export type LaunchBehavior = "show" | "tray";
export type Density = "compact" | "comfortable" | "spacious";

export type ColorTheme = "pastel" | "dark" | "vivid" | "mono";

export interface AppearanceSettings {
  noteOpacity: number;  // 0.65 to 1.0
  fontScale: number;    // 0.85 to 1.25
  density: Density;
  colorTheme: ColorTheme;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  noteOpacity: 0.94,
  fontScale: 1,
  density: "comfortable",
  colorTheme: "pastel",
};

export interface AppSettings {
  schemaVersion: number;
  locale?: string;
  hotkey?: string;
  window?: WindowSettings;
  displayMode?: DisplayMode;
  alwaysOnTop?: boolean;
  notificationsEnabled?: boolean;
  startAtLogin?: boolean;
  interactionMode?: InteractionMode;
  launchBehavior?: LaunchBehavior;
  appearance?: AppearanceSettings;
  searchHistory?: string[];
}

export interface StorageInfo {
  notesPath: string;
  settingsPath: string;
  method: "Tauri FS" | "localStorage";
  schemaVersion: number;
}

let onSaveErrorCallback: ((msg: string) => void) | null = null;

export function setOnSaveError(cb: (msg: string) => void) {
  onSaveErrorCallback = cb;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function migrateLocalStorageToFileIfNeeded(): Promise<void> {
  if (!isTauri()) return;

  try {
    const { exists, BaseDirectory } = await import("@tauri-apps/plugin-fs");
    
    if (await exists("notes.json", { baseDir: BaseDirectory.AppData })) {
      return; // Already migrated or exists
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const notes = JSON.parse(raw) as StickyNote[];
      await saveAllNotes(notes);
      console.log("[storage] Migrated notes from localStorage to notes.json");
    }
  } catch (e) {
    console.warn("[storage] Migration failed:", e);
  }
}

export async function loadAllGroups(): Promise<NoteGroup[]> {
  if (isTauri()) {
    try {
      const { exists, readTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      if (await exists("notes.json", { baseDir: BaseDirectory.AppData })) {
        const text = await readTextFile("notes.json", { baseDir: BaseDirectory.AppData });
        try {
          const data = JSON.parse(text);
          return (data.groups || []) as NoteGroup[];
        } catch {
          return [];
        }
      }
    } catch {
      return [];
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY + "-groups");
    if (!raw) return [];
    return JSON.parse(raw) as NoteGroup[];
  } catch {
    return [];
  }
}

export async function loadAllNotes(): Promise<StickyNote[]> {
  if (isTauri()) {
    try {
      const { exists, readTextFile, writeTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      if (await exists("notes.json", { baseDir: BaseDirectory.AppData })) {
        const text = await readTextFile("notes.json", { baseDir: BaseDirectory.AppData });
        try {
          const data = JSON.parse(text);
          const notes = (data.notes || []) as StickyNote[];
          return notes.map(n => {
            if (n.kind === "plain" && isUrl(n.body)) {
              return { ...n, kind: "url" };
            }
            return n;
          });
        } catch (e) {
          console.warn("[storage] Failed to parse notes.json, backing up corrupt file.", e);
          const timestamp = new Date().getTime();
          try {
            await writeTextFile(`notes.corrupt.${timestamp}.json`, text, { baseDir: BaseDirectory.AppData });
          } catch (backupErr) {
            console.error("[storage] Failed to backup corrupt file:", backupErr);
          }
          return [];
        }
      }
    } catch (e) {
      console.warn("[storage] Tauri FS load failed, falling back to localStorage", e);
    }
  }

  // Fallback / Browser
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const notes = JSON.parse(raw) as StickyNote[];
    return notes.map(n => {
      if (n.kind === "plain" && isUrl(n.body)) {
        return { ...n, kind: "url" };
      }
      return n;
    });
  } catch {
    console.warn("[storage] Failed to parse notes from localStorage");
    return [];
  }
}

export async function saveAllNotes(notes: StickyNote[], groups: NoteGroup[] = []): Promise<void> {
  const data = {
    schemaVersion: 1,
    notes: notes.map((note) => {
      const { previewUrl: _previewUrl, ...rest } = note;
      void _previewUrl;
      return rest;
    }),
    groups
  };

  if (isTauri()) {
    try {
      const { exists, mkdir, writeTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      
      // Ensure AppData dir exists
      if (!(await exists("", { baseDir: BaseDirectory.AppData }))) {
        await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
      }

      await writeTextFile("notes.json", JSON.stringify(data, null, 2), { baseDir: BaseDirectory.AppData });
      return;
    } catch (e) {
      console.warn("[storage] Tauri FS save failed, falling back to localStorage", e);
      if (onSaveErrorCallback) onSaveErrorCallback("save_failed_fallback");
    }
  }

  // Fallback / Browser
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.notes));
    localStorage.setItem(STORAGE_KEY + "-groups", JSON.stringify(groups));
  } catch (e) {
    console.error("[storage] Failed to save notes:", e);
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const defaultSettings: AppSettings = {
    schemaVersion: 1,
    displayMode: "board",
    alwaysOnTop: false,
    notificationsEnabled: true,
    startAtLogin: false,
    interactionMode: "edit",
    launchBehavior: "show",
    appearance: { ...DEFAULT_APPEARANCE },
    hotkey: "Ctrl+Shift+Space"
  };

  if (isTauri()) {
    try {
      const { exists, readTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      if (await exists("settings.json", { baseDir: BaseDirectory.AppData })) {
        const text = await readTextFile("settings.json", { baseDir: BaseDirectory.AppData });
        const data = JSON.parse(text);
        return { ...defaultSettings, ...data };
      }
    } catch (e) {
      console.warn("[storage] Tauri FS load settings failed, falling back to localStorage", e);
    }
  }
  
  // Fallback
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved === "en" || saved === "ja") return { ...defaultSettings, locale: saved };
  return defaultSettings;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  if (isTauri()) {
    try {
      const { exists, mkdir, writeTextFile, BaseDirectory } = await import("@tauri-apps/plugin-fs");
      if (!(await exists("", { baseDir: BaseDirectory.AppData }))) {
        await mkdir("", { baseDir: BaseDirectory.AppData, recursive: true });
      }
      
      const current = await loadSettings();
      const updated = { ...current, ...settings };
      
      await writeTextFile("settings.json", JSON.stringify(updated, null, 2), { baseDir: BaseDirectory.AppData });
      return;
    } catch (e) {
      console.warn("[storage] Tauri FS save settings failed, falling back to localStorage", e);
      if (onSaveErrorCallback) onSaveErrorCallback("save_failed_fallback");
    }
  }

  // Fallback
  if (settings.locale) {
    localStorage.setItem(SETTINGS_KEY, settings.locale);
  }
}

export async function getStorageInfo(): Promise<StorageInfo> {
  if (isTauri()) {
    try {
      const { appDataDir, join } = await import("@tauri-apps/api/path");
      const dataDir = await appDataDir();
      return {
        notesPath: await join(dataDir, "notes.json"),
        settingsPath: await join(dataDir, "settings.json"),
        method: "Tauri FS",
        schemaVersion: 1
      };
    } catch (e) {
      console.error("[storage] Failed to get path info", e);
    }
  }

  return {
    notesPath: "localStorage",
    settingsPath: "localStorage",
    method: "localStorage",
    schemaVersion: 1
  };
}

export function createNoteDraft(input: {
  kind: NoteKind;
  body: string;
  title?: string;
  path?: string;
  color?: NoteColor;
  size?: NoteSize;
  x?: number;
  y?: number;
  alarmAt?: string;
  expiresAt?: string;
  reviewAfter?: string;
  previewUrl?: string;
}): StickyNote {
  const now = new Date().toISOString();
  const jitterX = Math.random() * 120 - 60;
  const jitterY = Math.random() * 120 - 60;
  return {
    id: crypto.randomUUID(),
    kind: input.kind,
    title: input.title,
    body: input.body,
    path: input.path,
    color: input.color ?? "yellow",
    size: input.size ?? "normal",
    x: input.x ?? Math.max(40, window.innerWidth / 2 - 140 + jitterX),
    y: input.y ?? Math.max(40, window.innerHeight / 2 - 100 + jitterY),
    pinned: false,
    collapsed: false,
    createdAt: now,
    updatedAt: now,
    alarmAt: input.alarmAt,
    expiresAt: input.expiresAt,
    reviewAfter: input.reviewAfter,
    previewUrl: input.previewUrl,
  };
}
