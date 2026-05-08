import { useState, useRef, useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useStickyNotes } from "./hooks/useStickyNotes";
import { AppDock } from "./components/AppDock";
import { StickyBoard } from "./components/StickyBoard";
import { GoatTrash } from "./components/GoatTrash";
import { QuickAddPanel } from "./components/QuickAddPanel";
import { GoatBelly } from "./components/GoatBelly";
import { StashDrawer } from "./components/StashDrawer";
import { SearchDrawer } from "./components/SearchDrawer";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { DropOverlay } from "./components/DropOverlay";
import { SelectionToolbar } from "./components/SelectionToolbar";
import { GroupFrame } from "./components/GroupFrame";
import { StickyMap } from "./components/StickyMap";
import { getBaseName, getExtension, isDangerousExecutable, isImageFile } from "./lib/pathUtils";
import type { BundleItem, NoteColor, NoteKind } from "./types";
import { useTranslation } from "./i18n/I18nContext";
import { getCurrentWindow, LogicalSize, LogicalPosition } from "@tauri-apps/api/window";
import { 
  isPermissionGranted, 
  requestPermission, 
  sendNotification 
} from "@tauri-apps/plugin-notification";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import { setOnSaveError, getStorageInfo, saveSettings, loadSettings, type StorageInfo, type DisplayMode, type InteractionMode, type LaunchBehavior, type AppearanceSettings, DEFAULT_APPEARANCE } from "./lib/storage";
import { exportBackup, type ExportData } from "./lib/backup";
import { getDroppedPathInfo, isTauriDropAvailable, type DroppedPathInfo } from "./lib/tauriDrop";
import {
  KANGAROO_POCKET_DROP_EVENT,
  KANGAROO_POCKET_OPEN_EVENT,
  openKangarooPocketWindow,
} from "./lib/kangarooPocket";

type DroppedFile = File & { path?: string };
type LayoutUndoSnapshot = Array<{ id: string; x: number; y: number }>;

const WINDOWS_PATH_RE = /^(?:[a-zA-Z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+)/;

function isLikelyPathInput(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed.includes("\n") && WINDOWS_PATH_RE.test(trimmed);
}

function getBundleTitle(items: BundleItem[]): string {
  const firstFolder = items.find((item) => item.kind === "folder");
  return firstFolder?.name || "作業セット";
}

function getBundleInput(items: BundleItem[]) {
  return {
    kind: "bundle" as const,
    title: getBundleTitle(items),
    body: items.map((item) => item.path).join("\n"),
    bundleItems: items,
    size: "wide" as const,
  };
}

function App() {
  const { t, isI18nLoaded } = useTranslation();
  const { notes, allNotes, groups, addNote, updateNote, updateNotes, createGroup, updateGroup, deleteGroup, moveGroup, moveNote, moveNotes, deleteNote, isLoaded, gatherNotes, normalizeNotes, importNotes } = useStickyNotes();
  const goatRef = useRef<HTMLDivElement>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [quickAddKind, setQuickAddKind] = useState<NoteKind | undefined>();
  const [goatActive, setGoatActive] = useState(false);
  const [goatEating, setGoatEating] = useState(false);
  const [goatTargetSize, setGoatTargetSize] = useState<{ width: number; height: number } | null>(null);
  const [clipboardError, setClipboardError] = useState("");
  
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("board");
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [dueNoteIds, setDueNoteIds] = useState<string[]>([]);
  const [reviewNoteIds, setReviewNoteIds] = useState<string[]>([]);
  const [goatBellyOpen, setGoatBellyOpen] = useState(false);
  const [stashDrawerOpen, setStashDrawerOpen] = useState(false);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [startAtLogin, setStartAtLogin] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("edit");
  const [launchBehavior, setLaunchBehavior] = useState<LaunchBehavior>("show");
  const [appearance, setAppearance] = useState<AppearanceSettings>({ ...DEFAULT_APPEARANCE });
  const [hotkey, setHotkey] = useState("Ctrl+Shift+Space");
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [layoutUndo, setLayoutUndo] = useState<LayoutUndoSnapshot | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Track notified alarms to prevent spam (noteId + time)
  const notifiedAlarms = useRef<Set<string>>(new Set());

  // Window state ref to avoid stale closure in events
  const windowSaveTimer = useRef<number | null>(null);

  const handleSelectNote = useCallback((id: string, multi: boolean) => {
    setSelectedNoteIds(prev => {
      if (multi) {
        if (prev.includes(id)) return prev.filter(i => i !== id);
        return [...prev, id];
      }
      return [id];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNoteIds([]);
  }, []);

  const handleRectangleSelect = useCallback((ids: string[], multi: boolean) => {
    setSelectedNoteIds(prev => {
      if (multi) {
        // Add unique ids to existing selection
        const next = [...prev];
        ids.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      }
      return ids;
    });
  }, []);

  // Keyboard listener for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearSelection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearSelection]);

  useEffect(() => {
    async function initSettings() {
      const settings = await loadSettings();
      if (settings.displayMode) {
        setDisplayMode(settings.displayMode);
      }
      if (settings.alwaysOnTop !== undefined) {
        setAlwaysOnTop(settings.alwaysOnTop);
        // Apply to window on startup
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          try {
            await getCurrentWindow().setAlwaysOnTop(settings.alwaysOnTop);
          } catch (e) {
            console.warn("Failed to set always on top on startup", e);
          }
        }
      }
      if (settings.notificationsEnabled !== undefined) {
        setNotificationsEnabled(settings.notificationsEnabled);
      }
      if (settings.startAtLogin !== undefined) {
        setStartAtLogin(settings.startAtLogin);
      }
      if (settings.launchBehavior !== undefined) {
        setLaunchBehavior(settings.launchBehavior);
        // Apply launch behavior
        if (settings.launchBehavior === "tray" && typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          getCurrentWindow().hide();
        }
      }
      if (settings.hotkey) {
        setHotkey(settings.hotkey);
        // Register initial hotkey in Rust
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          invoke("update_hotkey", { oldHotkey: null, newHotkey: settings.hotkey })
            .catch((err: unknown) => {
              console.error("Failed to register initial hotkey:", err);
              setToast(t("hotkey.failed"));
              setTimeout(() => setToast(null), 4000);
            });
        }
      }
      if (settings.appearance) {
        setAppearance({ ...DEFAULT_APPEARANCE, ...settings.appearance });
      }
      if (settings.searchHistory) {
        setSearchHistory(settings.searchHistory);
      }
      
      // Safety: always start in edit mode
      setInteractionMode("edit");
      saveSettings({ interactionMode: "edit" });
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        getCurrentWindow().setIgnoreCursorEvents(false);
      }

      // Load storage info for settings drawer
      const info = await getStorageInfo();
      setStorageInfo(info);
    }
    initSettings();

    // Check/Request notification permission
    async function checkPerms() {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          await requestPermission();
        }
      }
    }
    checkPerms();

    // Sync Autostart state
    async function syncAutostart() {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        try {
          const osEnabled = await isEnabled();
          setStartAtLogin(osEnabled);
          saveSettings({ startAtLogin: osEnabled });
        } catch (e) {
          console.warn("Failed to sync autostart status", e);
        }
      }
    }
    syncAutostart();

    // Force Edit Listeners
    let unlistenForceEdit: (() => void) | undefined;
    listen("sticky-force-edit", () => {
      setInteractionMode("edit");
      saveSettings({ interactionMode: "edit" });
      // Rust already sets ignore_cursor_events(false), but let's be sure
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        getCurrentWindow().setIgnoreCursorEvents(false);
      }
    }).then(fn => unlistenForceEdit = fn);

    return () => {
      if (unlistenForceEdit) unlistenForceEdit();
    };
  }, [t]);

  useEffect(() => {
    setOnSaveError((msgKey) => {
      setToast(t(`notifications.${msgKey}`));
      setTimeout(() => setToast(null), 4000);
    });
  }, [t]);

  const handleOpenQuickAdd = useCallback((kind?: "plain" | "code") => {
    setQuickAddKind(kind);
    setQuickAddOpen(true);
  }, []);

  const handleUpdateHotkey = async (newHotkey: string) => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      try {
        await invoke("update_hotkey", { oldHotkey: hotkey, newHotkey });
        setHotkey(newHotkey);
        await saveSettings({ hotkey: newHotkey });
      } catch (err: unknown) {
        console.error("Failed to update hotkey:", err);
        setToast(t("hotkey.failed") + ": " + t("hotkey.conflictHint"));
        setTimeout(() => setToast(null), 4000);
        throw err; // Propagate to UI for feedback
      }
    }
  };

  const handleClipboardAdd = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setClipboardError(t("clipboard.error"));
        setTimeout(() => setClipboardError(""), 2000);
        return;
      }
      addNote({ body: text });
    } catch (e) {
      console.error("Clipboard read error:", e);
      setClipboardError(t("clipboard.error"));
      setTimeout(() => setClipboardError(""), 2000);
    }
  }, [addNote, t]);

   const handleQuickAddSubmit = useCallback(
    async (body: string, color: NoteColor, kind?: NoteKind, alarmAt?: string, temporary?: { expiresAt: string, reviewAfter: string }) => {
      if (!kind && isTauriDropAvailable() && isLikelyPathInput(body)) {
        try {
          const [info] = await getDroppedPathInfo([body.trim()]);
          if (info && info.kind !== "unknown") {
            const noteKind: NoteKind = info.kind === "folder" ? "folder" : info.isImage ? "image" : "file";
            addNote({
              body: info.path,
              path: info.path,
              title: info.name || getBaseName(info.path),
              color,
              kind: noteKind,
              alarmAt,
              ...temporary,
            });
            return;
          }
        } catch (error) {
          console.warn("[quick-add] Failed to inspect pasted path", error);
        }
      }

      addNote({ body, color, kind, alarmAt, ...temporary });
    },
    [addNote]
  );

  const handleAddSketch = useCallback(() => {
    addNote({ 
      kind: "sketch", 
      body: "", 
      inkStrokes: [], 
      sketchBackground: "plain" 
    });
  }, [addNote]);

  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    let unlisten: (() => void) | undefined;
    
    const setupListener = async () => {
      try {
        unlisten = await listen("sticky-new-note", () => {
          handleOpenQuickAdd();
        });
      } catch (err) {
        console.warn("Failed to listen for sticky-new-note:", err);
      }
    };
    
    setupListener();
    
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [handleOpenQuickAdd]);

  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    let unlistenGather: (() => void) | undefined;
    
    const setupListeners = async () => {
      try {
        unlistenGather = await listen("sticky-gather-notes", () => {
          gatherNotes();
        });
      } catch (err) {
        console.warn("Failed to listen for events:", err);
      }
    };
    
    setupListeners();
    
    return () => {
      if (unlistenGather) unlistenGather();
    };
  }, [gatherNotes]);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode(prev => {
      const next = prev === "board" ? "desktop" : "board";
      saveSettings({ displayMode: next });
      if (next === "desktop") {
        normalizeNotes();
      }
      return next;
    });
  }, [normalizeNotes]);

  const toggleAlwaysOnTop = useCallback(async () => {
    setAlwaysOnTop(prev => {
      const next = !prev;
      saveSettings({ alwaysOnTop: next });
      
      // Apply to window
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        getCurrentWindow().setAlwaysOnTop(next).catch(err => {
          console.warn("Failed to set always on top", err);
        });
      }
      
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    let unlistenToggle: (() => void) | undefined;
    let unlistenAlwaysOnTop: (() => void) | undefined;
    
    const setupToggleListeners = async () => {
      try {
        unlistenToggle = await listen("sticky-toggle-display-mode", () => {
          toggleDisplayMode();
        });
        unlistenAlwaysOnTop = await listen("sticky-toggle-always-on-top", () => {
          toggleAlwaysOnTop();
        });
      } catch (err) {
        console.warn("Failed to listen for toggle events:", err);
      }
    };
    
    setupToggleListeners();
    
    return () => {
      if (unlistenToggle) unlistenToggle();
      if (unlistenAlwaysOnTop) unlistenAlwaysOnTop();
    };
  }, [toggleDisplayMode, toggleAlwaysOnTop]);

  // Window state persistence
  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;

    const win = getCurrentWindow();
    
    const saveWindowState = async () => {
      if (windowSaveTimer.current) window.clearTimeout(windowSaveTimer.current);
      windowSaveTimer.current = window.setTimeout(async () => {
        try {
          const size = await win.innerSize();
          const pos = await win.innerPosition();
          await saveSettings({
            window: { width: size.width, height: size.height, x: pos.x, y: pos.y }
          });
        } catch (e) {
          console.warn("Failed to save window state", e);
        }
      }, 500);
    };

    const setupWindow = async () => {
      // Restore state
      const settings = await loadSettings();
      if (settings.window) {
        // Basic safety: don't restore if completely off-screen (negative)
        if (settings.window.x >= 0 && settings.window.y >= 0) {
          await win.setSize(new LogicalSize(settings.window.width, settings.window.height));
          await win.setPosition(new LogicalPosition(settings.window.x, settings.window.y));
        }
      }

      // Listen for changes
      const unlistenResized = await win.onResized(saveWindowState);
      const unlistenMoved = await win.onMoved(saveWindowState);
      
      return () => {
        unlistenResized();
        unlistenMoved();
      };
    };

    let cleanup: (() => void) | undefined;
    setupWindow().then(cb => cleanup = cb);

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Alarm Monitoring
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const due = notes
        .filter(n => !n.completedAt && (n.snoozedUntil || n.alarmAt))
        .filter(n => {
          const targetStr = n.snoozedUntil || n.alarmAt!;
          const target = new Date(targetStr);
          const isDue = target <= now;

          if (isDue && notificationsEnabled) {
            const alarmKey = `${n.id}-${targetStr}`;
            if (!notifiedAlarms.current.has(alarmKey)) {
              notifiedAlarms.current.add(alarmKey);
              if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
                isPermissionGranted().then(granted => {
                  if (granted) {
                    sendNotification({
                      title: t("notification.alarmTitle"),
                      body: n.body.slice(0, 60) + (n.body.length > 60 ? "..." : "")
                    });
                  }
                });
              }
            }
          }

          return isDue;
        })
        .map(n => n.id);
      
      setDueNoteIds(prev => {
        if (prev.length === due.length && prev.every((id, i) => id === due[i])) return prev;
        return due;
      });
    };

    const timer = setInterval(checkAlarms, 30000); // 30 seconds
    checkAlarms(); // Initial check
    
    return () => clearInterval(timer);
  }, [notes, notificationsEnabled, t]);

  const handleSnooze = useCallback((id: string) => {
    const snoozeTime = new Date(Date.now() + 5 * 60000).toISOString();
    updateNote(id, { snoozedUntil: snoozeTime });
    setDueNoteIds(prev => prev.filter(nid => nid !== id));
  }, [updateNote]);

  const handleAlarmDone = useCallback((id: string) => {
    updateNote(id, { completedAt: new Date().toISOString() });
    setDueNoteIds(prev => prev.filter(nid => nid !== id));
  }, [updateNote]);

  // Review Monitoring
  useEffect(() => {
    const checkReview = () => {
      const now = new Date();
      const needsReview = notes
        .filter(n => !!n.reviewAfter && new Date(n.reviewAfter) <= now)
        .map(n => n.id);
      
      setReviewNoteIds(prev => {
        if (prev.length === needsReview.length && prev.every((id, i) => id === needsReview[i])) return prev;
        return needsReview;
      });
    };

    const timer = setInterval(checkReview, 60000); // 1 minute
    checkReview();
    return () => clearInterval(timer);
  }, [notes]);

  const handleDelete = useCallback(
    (id: string, by: "goat" | "manual") => {
      deleteNote(id, by);
      if (by === "goat") {
        setGoatEating(true);
        setTimeout(() => setGoatEating(false), 1200);
      }
    },
    [deleteNote]
  );

  const handleExportData = async () => {
    const currentSettings = await loadSettings();
    await exportBackup(allNotes, currentSettings);
  };

  const handleImportData = async (data: ExportData, mode: "merge" | "replace") => {
    const importedNotes = data.notesData.notes;
    const importedSettings = data.settingsData;
    const currentSettings = await loadSettings();

    if (mode === "merge") {
      importNotes(importedNotes, "merge");
    } else {
      // Replace
      importNotes(importedNotes, "replace");
      
      // Safe settings merge
      if (importedSettings) {
        const safeSettings = { ...currentSettings };
        if (importedSettings.locale) safeSettings.locale = importedSettings.locale;
        if (importedSettings.displayMode) safeSettings.displayMode = importedSettings.displayMode;
        if (typeof importedSettings.alwaysOnTop === "boolean") safeSettings.alwaysOnTop = importedSettings.alwaysOnTop;
        if (typeof importedSettings.notificationsEnabled === "boolean") safeSettings.notificationsEnabled = importedSettings.notificationsEnabled;
        if (importedSettings.launchBehavior) safeSettings.launchBehavior = importedSettings.launchBehavior;
        if (importedSettings.appearance) safeSettings.appearance = importedSettings.appearance;
        
        safeSettings.interactionMode = "edit"; // Force safe interaction mode
        // Note: hotkey, startAtLogin, and window position are kept as current.
        
        // Apply settings
        if (safeSettings.displayMode) setDisplayMode(safeSettings.displayMode);
        if (safeSettings.alwaysOnTop !== undefined) setAlwaysOnTop(safeSettings.alwaysOnTop);
        if (safeSettings.notificationsEnabled !== undefined) setNotificationsEnabled(safeSettings.notificationsEnabled);
        if (safeSettings.interactionMode) setInteractionMode(safeSettings.interactionMode);
        if (safeSettings.launchBehavior) setLaunchBehavior(safeSettings.launchBehavior);
        if (safeSettings.appearance) setAppearance(safeSettings.appearance);
        
        await saveSettings(safeSettings);
      }
    }
  };

  const handleKeepToday = useCallback((id: string) => {
    const expires = new Date();
    expires.setHours(23, 59, 59, 999);
    const review = new Date();
    review.setDate(review.getDate() + 1);
    review.setHours(9, 0, 0, 0);
    updateNote(id, { expiresAt: expires.toISOString(), reviewAfter: review.toISOString(), stashedAt: undefined });
    setReviewNoteIds(prev => prev.filter(nid => nid !== id));
  }, [updateNote]);

  const handleStashFromReview = useCallback((id: string) => {
    updateNote(id, { stashedAt: new Date().toISOString(), expiresAt: undefined, reviewAfter: undefined });
    setReviewNoteIds(prev => prev.filter(nid => nid !== id));
  }, [updateNote]);

  const handleFeedGoatFromReview = useCallback((id: string) => {
    handleDelete(id, "goat");
    setReviewNoteIds(prev => prev.filter(nid => nid !== id));
  }, [handleDelete]);

  const handleRestore = useCallback((id: string) => {
    const note = allNotes.find(n => n.id === id);
    if (!note) return;

    // Center where it will be restored
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const step = notes.length % 10;
    const dx = (centerX - 200 + step * 24) - note.x - (note.size === "wide" ? 180 : 140);
    const dy = (centerY - 150 + step * 24) - note.y - 80;

    const updates = allNotes.map(n => ({
      id: n.id,
      partial: {
        x: n.x + dx,
        y: n.y + dy,
        ...(n.id === id ? { 
          deletedAt: undefined, 
          deletedBy: undefined, 
          stashedAt: undefined,
          restoredAt: new Date().toISOString(),
          lastFocusedAt: new Date().toISOString(),
          lastInteractedAt: new Date().toISOString()
        } : {})
      }
    }));
    updateNotes(updates);

    groups.forEach(g => {
      updateGroup(g.id, { x: g.x + dx, y: g.y + dy });
    });

    setSelectedNoteIds([id]);
  }, [allNotes, notes.length, groups, updateNotes, updateGroup]);

  const handleUnstash = useCallback((id: string) => {
    const note = allNotes.find(n => n.id === id);
    if (!note) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const step = notes.length % 10;
    const dx = (centerX - 200 + step * 24) - note.x - (note.size === "wide" ? 180 : 140);
    const dy = (centerY - 150 + step * 24) - note.y - 80;

    const updates = allNotes.map(n => ({
      id: n.id,
      partial: {
        x: n.x + dx,
        y: n.y + dy,
        ...(n.id === id ? { 
          stashedAt: undefined, 
          unstashedAt: new Date().toISOString(),
          lastFocusedAt: new Date().toISOString(),
          lastInteractedAt: new Date().toISOString()
        } : {})
      }
    }));
    updateNotes(updates);

    groups.forEach(g => {
      updateGroup(g.id, { x: g.x + dx, y: g.y + dy });
    });

    setSelectedNoteIds([id]);
  }, [allNotes, notes.length, groups, updateNotes, updateGroup]);

  const handleFocusNote = useCallback((id: string) => {
    const note = allNotes.find(n => n.id === id);
    if (!note) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const dx = centerX - note.x - (note.size === "wide" ? 180 : 140);
    const dy = centerY - note.y - 80;

    const updates = allNotes.map(n => ({
      id: n.id,
      partial: {
        x: n.x + dx,
        y: n.y + dy,
        ...(n.id === id ? { 
          lastFocusedAt: new Date().toISOString(),
          lastInteractedAt: new Date().toISOString() 
        } : {})
      }
    }));
    updateNotes(updates);

    groups.forEach(g => {
      updateGroup(g.id, { x: g.x + dx, y: g.y + dy });
    });

    setSelectedNoteIds([id]);
  }, [allNotes, groups, updateNotes, updateGroup]);

  const handleSearchEnter = useCallback((q: string) => {
    setSearchHistory(prev => {
      const next = [q, ...prev.filter(h => h.toLowerCase() !== q.toLowerCase())].slice(0, 10);
      saveSettings({ searchHistory: next });
      return next;
    });
  }, []);

  const handleHistoryClear = useCallback(() => {
    setSearchHistory([]);
    saveSettings({ searchHistory: [] });
  }, []);
  const handleMoveNote = useCallback((id: string, x: number, y: number) => {
    const note = allNotes.find(n => n.id === id);
    if (!note) return;

    if (selectedNoteIds.includes(id)) {
      const dx = x - note.x;
      const dy = y - note.y;
      moveNotes(selectedNoteIds, dx, dy);
    } else {
      moveNote(id, x, y);
    }
    // Activate goat when dragging
    if (!goatActive) setGoatActive(true);
  }, [moveNote, moveNotes, allNotes, selectedNoteIds, goatActive]);

  const handleNoteDragStart = useCallback((size: { width: number; height: number }) => {
    const padding = 28;
    const maxWidth = Math.max(120, window.innerWidth - 40);
    const maxHeight = Math.max(120, window.innerHeight - 120);
    setGoatTargetSize({
      width: Math.min(maxWidth, Math.max(100, Math.ceil(size.width + padding))),
      height: Math.min(maxHeight, Math.max(100, Math.ceil(size.height + padding))),
    });
  }, []);

  const handleNoteDragEnd = useCallback(() => {
    setGoatActive(false);
    setGoatTargetSize(null);
  }, []);

  const handleBulkStash = useCallback(() => {
    const targets = selectedNoteIds.filter(id => {
      const n = allNotes.find(note => note.id === id);
      return n && !n.locked && !n.deletedAt && !n.stashedAt;
    });
    
    targets.forEach(id => {
      updateNote(id, { stashedAt: new Date().toISOString() });
    });
    
    setSelectedNoteIds(prev => prev.filter(id => !targets.includes(id)));
  }, [selectedNoteIds, allNotes, updateNote]);

  const handleBulkDelete = useCallback(() => {
    const targets = selectedNoteIds.filter(id => {
      const n = allNotes.find(note => note.id === id);
      return n && !n.locked;
    });

    if (targets.length === 0) return;
    
    const confirmed = targets.length < 2 || window.confirm(t("selection.confirmFeedGoat"));
    if (!confirmed) return;

    targets.forEach(id => {
      deleteNote(id, "manual");
    });
    
    setSelectedNoteIds(prev => prev.filter(id => !targets.includes(id)));
  }, [selectedNoteIds, allNotes, deleteNote, t]);

  const handleBulkLock = useCallback((locked: boolean) => {
    const targets = selectedNoteIds.filter(id => {
      const n = allNotes.find(note => note.id === id);
      return n && !n.deletedAt;
    });

    targets.forEach(id => {
      updateNote(id, { locked });
    });
  }, [selectedNoteIds, allNotes, updateNote]);

  const rememberLayout = useCallback((targets: LayoutUndoSnapshot) => {
    setLayoutUndo(targets.map(({ id, x, y }) => ({ id, x, y })));
  }, []);

  const handleUndoLayout = useCallback(() => {
    if (!layoutUndo) return;
    updateNotes(layoutUndo.map(({ id, x, y }) => ({ id, partial: { x, y } })));
    setLayoutUndo(null);
  }, [layoutUndo, updateNotes]);

  const handleAlignLeft = useCallback(() => {
    const targets = notes.filter(n => selectedNoteIds.includes(n.id) && !n.locked);
    if (targets.length < 2) return;
    const minX = Math.min(...targets.map(n => n.x));
    rememberLayout(targets);
    updateNotes(targets.map(n => ({ id: n.id, partial: { x: minX } })));
  }, [notes, rememberLayout, selectedNoteIds, updateNotes]);

  const handleAlignTop = useCallback(() => {
    const targets = notes.filter(n => selectedNoteIds.includes(n.id) && !n.locked);
    if (targets.length < 2) return;
    const minY = Math.min(...targets.map(n => n.y));
    rememberLayout(targets);
    updateNotes(targets.map(n => ({ id: n.id, partial: { y: minY } })));
  }, [notes, rememberLayout, selectedNoteIds, updateNotes]);

  const handleArrangeRow = useCallback(() => {
    const targets = notes.filter(n => selectedNoteIds.includes(n.id) && !n.locked)
      .sort((a, b) => a.x - b.x);
    if (targets.length < 2) return;
    rememberLayout(targets);
    
    const minX = Math.min(...targets.map(n => n.x));
    const minY = Math.min(...targets.map(n => n.y));
    const gap = 24;
    
    let currentX = minX;
    const updates = targets.map(n => {
      const update = { id: n.id, partial: { x: currentX, y: minY } };
      const width = n.size === "wide" ? 360 : 280;
      currentX += width + gap;
      return update;
    });
    
    updateNotes(updates);
  }, [notes, rememberLayout, selectedNoteIds, updateNotes]);

  const handleArrangeColumn = useCallback(() => {
    const targets = notes.filter(n => selectedNoteIds.includes(n.id) && !n.locked)
      .sort((a, b) => a.y - b.y);
    if (targets.length < 2) return;
    rememberLayout(targets);

    const minX = Math.min(...targets.map(n => n.x));
    const minY = Math.min(...targets.map(n => n.y));
    const gap = 24;

    let currentY = minY;
    const updates = targets.map(n => {
      const update = { id: n.id, partial: { x: minX, y: currentY } };
      // Estimate height: base 160 + roughly based on body length
      const estimatedHeight = Math.max(160, 120 + (n.body.length / 4));
      currentY += estimatedHeight + gap;
      return update;
    });

    updateNotes(updates);
  }, [notes, rememberLayout, selectedNoteIds, updateNotes]);

  const handleDistribute = useCallback(() => {
    const targets = notes.filter(n => selectedNoteIds.includes(n.id) && !n.locked)
      .sort((a, b) => a.x - b.x);
    if (targets.length < 3) return;
    rememberLayout(targets);

    const minX = targets[0].x;
    const maxX = targets[targets.length - 1].x;
    const totalDist = maxX - minX;
    const step = totalDist / (targets.length - 1);

    const updates = targets.map((n, i) => ({
      id: n.id,
      partial: { x: minX + step * i }
    }));

    updateNotes(updates);
  }, [notes, rememberLayout, selectedNoteIds, updateNotes]);

  const handleBulkColorChange = useCallback((color: NoteColor) => {
    const targets = notes.filter(n => selectedNoteIds.includes(n.id) && !n.locked);
    const lockedCount = notes.filter(n => selectedNoteIds.includes(n.id) && n.locked).length;

    if (targets.length > 0) {
      updateNotes(targets.map(n => ({ id: n.id, partial: { color } })));
    }

    if (lockedCount > 0) {
      setToast(t("color.skippedLocked"));
      setTimeout(() => setToast(null), 3000);
    }
  }, [notes, selectedNoteIds, updateNotes, t]);

  const handleCreateGroup = useCallback(() => {
    const title = window.prompt(t("group.rename"), t("group.defaultTitle"));
    if (title === null) return;
    createGroup(selectedNoteIds, title || t("group.defaultTitle"));
    clearSelection();
  }, [selectedNoteIds, createGroup, clearSelection, t]);

  const handleSelectNotesInGroup = useCallback((groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (group?.collapsed) {
      updateGroup(groupId, { collapsed: false });
    }
    const ids = notes.filter(n => n.groupId === groupId).map(n => n.id);
    setSelectedNoteIds(ids);
  }, [notes, groups, updateGroup]);

  const handleStashNotesInGroup = useCallback((groupId: string) => {
    if (!window.confirm(t("group.confirmStash"))) return;
    const targets = notes.filter(n => n.groupId === groupId && !n.locked);
    if (targets.length === 0) return;

    updateNotes(targets.map(n => ({ 
      id: n.id, 
      partial: { stashedAt: new Date().toISOString(), groupId: undefined } 
    })));

    // If no active notes left in group, delete group
    const remaining = notes.filter(n => n.groupId === groupId).length;
    if (remaining <= targets.length) {
      deleteGroup(groupId);
    }
  }, [notes, updateNotes, deleteGroup, t]);

  const handleLockNotesInGroup = useCallback((groupId: string, locked: boolean) => {
    const targets = notes.filter(n => n.groupId === groupId);
    if (targets.length === 0) return;
    updateNotes(targets.map(n => ({ id: n.id, partial: { locked } })));
  }, [notes, updateNotes]);

  const handleJump = useCallback((worldX: number, worldY: number) => {
    // We want worldX, worldY to be at window center (innerWidth/2, innerHeight/2)
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const dx = centerX - worldX;
    const dy = centerY - worldY;

    // Move everything (including groups and locked notes for "camera pan" feel)
    // Actually, useStickyNotes.moveNotes skips locked.
    // Let's use updateNotes to move EVERYTHING.
    const noteUpdates = allNotes.map(n => ({
      id: n.id,
      partial: { x: n.x + dx, y: n.y + dy }
    }));
    updateNotes(noteUpdates);

    // Also move groups
    groups.forEach(g => {
      updateGroup(g.id, { x: g.x + dx, y: g.y + dy });
    });
  }, [allNotes, groups, updateNotes, updateGroup]);

  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled(prev => {
      const newVal = !prev;
      saveSettings({ notificationsEnabled: newVal });
      return newVal;
    });
  }, []);

  const toggleAutostart = useCallback(async () => {
    const newVal = !startAtLogin;
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      try {
        if (newVal) await enable();
        else await disable();
        setStartAtLogin(newVal);
        saveSettings({ startAtLogin: newVal });
      } catch (e) {
        console.error("Failed to toggle autostart", e);
        setToast(t("autostart.failed"));
        setTimeout(() => setToast(null), 3000);
      }
    } else {
      console.warn("Autostart not supported in browser");
    }
  }, [startAtLogin, t]);

  const handleSetInteractionMode = useCallback(async (mode: InteractionMode) => {
    if (displayMode !== "desktop" && mode === "passThrough") return;

    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      try {
        await getCurrentWindow().setIgnoreCursorEvents(mode === "passThrough");
        setInteractionMode(mode);
        saveSettings({ interactionMode: mode });
      } catch (e) {
        console.error("Failed to set interaction mode", e);
      }
    } else {
      setInteractionMode(mode);
    }
  }, [displayMode]);

  const handleFileDrop = useCallback(
    (files: FileList) => {
      if (files.length > 1) {
        const bundleItems: BundleItem[] = Array.from(files).map((file) => {
          const dropped = file as DroppedFile;
          const filePath = dropped.path || dropped.name;
          return {
            id: crypto.randomUUID(),
            path: filePath,
            name: dropped.name || getBaseName(filePath),
            kind: isImageFile(filePath) ? "image" : "file",
            extension: getExtension(filePath).replace(/^\./, "") || undefined,
          };
        });
        addNote(getBundleInput(bundleItems));
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i] as DroppedFile;
        const fileName = file.name;
        const filePath = file.path || fileName;

        if (isDangerousExecutable(fileName)) {
          console.warn("[drop] BLOCKED: dangerous executable dropped:", fileName);
          continue;
        }

        const isImage = isImageFile(filePath);
        const kind: NoteKind = isImage ? "image" : "file";
        
        let previewUrl: string | undefined;
        if (isImage && !file.path) {
          // Browser fallback: create a blob URL
          previewUrl = URL.createObjectURL(file);
        }

        addNote({
          kind,
          title: getBaseName(fileName),
          body: filePath,
          path: filePath,
          previewUrl,
        });
      }
    },
    [addNote]
  );

  const handlePathDrop = useCallback(
    (infos: DroppedPathInfo[]) => {
      if (infos.length > 1) {
        const bundleItems: BundleItem[] = infos.map((info) => ({
          id: crypto.randomUUID(),
          path: info.path,
          name: info.name || getBaseName(info.path),
          kind: info.kind === "file" && info.isImage ? "image" : info.kind,
          extension: info.extension,
        }));
        addNote(getBundleInput(bundleItems));
        return;
      }

      infos.forEach((info) => {
        const fileName = info.name || getBaseName(info.path);

        if (info.kind !== "folder" && isDangerousExecutable(fileName)) {
          console.warn("[drop] BLOCKED: dangerous executable dropped:", fileName);
          return;
        }

        const kind: NoteKind = info.kind === "folder" ? "folder" : info.isImage ? "image" : "file";

        addNote({
          kind,
          title: fileName,
          body: info.path,
          path: info.path,
        });
      });
    },
    [addNote]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    let unlistenOpenPocket: (() => void) | undefined;
    let unlistenPocketDrop: (() => void) | undefined;

    async function setupKangarooPocketListeners() {
      try {
        unlistenOpenPocket = await listen(KANGAROO_POCKET_OPEN_EVENT, () => {
          openKangarooPocketWindow();
        });
        unlistenPocketDrop = await listen<DroppedPathInfo[]>(KANGAROO_POCKET_DROP_EVENT, (event) => {
          const win = getCurrentWindow();
          win.show().catch((error) => {
            console.warn("[kangaroo-pocket] Failed to show main window", error);
          });
          win.setFocus().catch((error) => {
            console.warn("[kangaroo-pocket] Failed to focus main window", error);
          });
          win.setIgnoreCursorEvents(false).catch((error) => {
            console.warn("[kangaroo-pocket] Failed to restore pointer events", error);
          });
          setInteractionMode("edit");
          saveSettings({ interactionMode: "edit" });
          handlePathDrop(event.payload);
          setToast(t("kangarooPocket.added"));
          window.setTimeout(() => setToast(null), 3000);
        });
      } catch (error) {
        console.warn("[kangaroo-pocket] Failed to wire events", error);
      }
    }

    setupKangarooPocketListeners();

    return () => {
      unlistenOpenPocket?.();
      unlistenPocketDrop?.();
    };
  }, [handlePathDrop, t]);

  if (!isLoaded || !isI18nLoaded) {
    return null; // Don't render until data is ready to avoid flicker
  }

  return (
    <div
      className={`app app--${displayMode} app--density-${appearance.density} app--theme-${appearance.colorTheme}`}
      style={{
        "--note-opacity": appearance.noteOpacity,
        "--font-scale": appearance.fontScale,
      } as React.CSSProperties}
      onPointerUp={handleNoteDragEnd}
    >
      <AppDock
        onOpenQuickAdd={(kind) => {
          setQuickAddKind(kind);
          setQuickAddOpen(true);
        }}
        onClipboardAdd={handleClipboardAdd}
        onGatherNotes={gatherNotes}
        onOpenGoatBelly={() => setGoatBellyOpen(true)}
        onOpenStashDrawer={() => setStashDrawerOpen(true)}
        onOpenSearchDrawer={() => setSearchDrawerOpen(true)}
        onOpenSettingsDrawer={() => setSettingsDrawerOpen(true)}
        onMapToggle={() => setMapOpen(prev => !prev)}
        onAddSketch={handleAddSketch}
        mapOpen={mapOpen}
        clipboardError={clipboardError}
      />

      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}

      {/* Alarm Toasts */}
      <div className="alarm-toast-container">
        {dueNoteIds.map(id => {
          const note = notes.find(n => n.id === id);
          if (!note) return null;
          return (
            <div key={id} className="alarm-toast">
              <div className="alarm-toast__icon">🐔</div>
              <div className="alarm-toast__content">
                <div className="alarm-toast__title">{t("alarm.due")}</div>
                <div className="alarm-toast__body">{note.body.slice(0, 40)}{note.body.length > 40 ? "..." : ""}</div>
                <div className="alarm-toast__actions">
                  <button className="alarm-toast__btn alarm-toast__btn--snooze" onClick={() => handleSnooze(id)}>
                    {t("alarm.snooze")}
                  </button>
                  <button className="alarm-toast__btn alarm-toast__btn--done" onClick={() => handleAlarmDone(id)}>
                    {t("alarm.done")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review UI Overlay */}
      {reviewNoteIds.length > 0 && (
        <div className="review-overlay">
          <div className="review-panel">
            <h3 className="review-panel__title">🐔 {t("temporary.reviewTitle")}</h3>
            <div className="review-panel__list">
              {reviewNoteIds.map(id => {
                const note = notes.find(n => n.id === id);
                if (!note) return null;
                return (
                  <div key={id} className="review-item">
                    <div className="review-item__body">{note.body.slice(0, 60)}{note.body.length > 60 ? "..." : ""}</div>
                    <div className="review-item__actions">
                      <button className="review-item__btn review-item__btn--keep" onClick={() => handleKeepToday(id)}>
                        {t("temporary.keep")}
                      </button>
                      <button className="review-item__btn review-item__btn--stash" onClick={() => handleStashFromReview(id)}>
                        {t("temporary.store")}
                      </button>
                      <button className="review-item__btn review-item__btn--goat" onClick={() => handleFeedGoatFromReview(id)}>
                        {t("temporary.feedGoat")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="review-panel__close" onClick={() => setReviewNoteIds([])}>×</button>
          </div>
        </div>
      )}

      {/* Stash Drawer */}
      {stashDrawerOpen && (
        <StashDrawer 
          notes={allNotes} 
          onRestore={(id) => {
            handleUnstash(id);
            setStashDrawerOpen(false);
          }}
          onFeedGoat={(id) => {
            handleDelete(id, "goat");
            // Also need to clear stashedAt when feeding to goat from stash
            updateNote(id, { stashedAt: undefined });
            setStashDrawerOpen(false);
          }}
          onClose={() => setStashDrawerOpen(false)}
        />
      )}

      {/* Search Drawer */}
      {searchDrawerOpen && (
        <SearchDrawer
          notes={allNotes}
          onShow={(id) => {
            handleFocusNote(id);
            setSearchDrawerOpen(false);
          }}
          onRestoreFromStash={(id) => {
            handleUnstash(id);
            setSearchDrawerOpen(false);
          }}
          onRestoreFromGoat={(id) => {
            handleRestore(id);
            setSearchDrawerOpen(false);
          }}
          onFeedGoat={(id) => {
            handleDelete(id, "goat");
            // Clear stashedAt when feeding goat from search result stash item
            updateNote(id, { stashedAt: undefined });
            setSearchDrawerOpen(false);
          }}
          onClose={() => setSearchDrawerOpen(false)}
          history={searchHistory}
          onHistoryClick={handleSearchEnter}
          onHistoryClear={handleHistoryClear}
          onSearchEnter={handleSearchEnter}
        />
      )}

      {/* Settings Drawer */}
      {settingsDrawerOpen && (
        <SettingsDrawer
          displayMode={displayMode}
          onSetDisplayMode={(mode) => {
            setDisplayMode(mode);
            saveSettings({ displayMode: mode });
            if (mode === "desktop") {
              const win = getCurrentWindow();
              win.setDecorations(false);
            }
          }}
          alwaysOnTop={alwaysOnTop}
          onToggleAlwaysOnTop={toggleAlwaysOnTop}
          notificationsEnabled={notificationsEnabled}
          onToggleNotifications={toggleNotifications}
          startAtLogin={startAtLogin}
          onToggleAutostart={toggleAutostart}
          storageInfo={storageInfo}
          interactionMode={interactionMode}
          onSetInteractionMode={handleSetInteractionMode}
          launchBehavior={launchBehavior}
          onSetLaunchBehavior={(behavior) => {
            setLaunchBehavior(behavior);
            saveSettings({ launchBehavior: behavior });
          }}
          appearance={appearance}
          onSetAppearance={(next) => {
            setAppearance(next);
            saveSettings({ appearance: next });
          }}
          hotkey={hotkey}
          onUpdateHotkey={handleUpdateHotkey}
          onExport={handleExportData}
          onImport={handleImportData}
          onClose={() => setSettingsDrawerOpen(false)}
        />
      )}

      {/* Goat Belly */}
      {goatBellyOpen && (
        <GoatBelly 
          notes={allNotes} 
          onRestore={(id) => {
            handleRestore(id);
            setGoatBellyOpen(false);
          }}
          onClose={() => setGoatBellyOpen(false)}
        />
      )}

      <StickyBoard
        notes={notes.filter(n => {
          if (!n.groupId) return true;
          const g = groups.find(group => group.id === n.groupId);
          return g ? !g.collapsed : true;
        })}
        onMove={handleMoveNote}
        onDelete={handleDelete}
        onUpdate={updateNote}
        onSelect={handleSelectNote}
        onRectangleSelect={handleRectangleSelect}
        onClearSelection={clearSelection}
        onAddText={() => handleOpenQuickAdd()}
        onAddSketch={handleAddSketch}
        onClipboardAdd={handleClipboardAdd}
        onOpenSettings={() => setSettingsDrawerOpen(true)}
        selectedNoteIds={selectedNoteIds}
        goatRef={goatRef}
        onNoteDragStart={handleNoteDragStart}
        onNoteDragEnd={handleNoteDragEnd}
      />

      {groups.map(g => (
        <GroupFrame 
          key={g.id} 
          group={g} 
          onUpdate={updateGroup} 
          onDelete={deleteGroup} 
          onMove={moveGroup}
          onSelectNotes={handleSelectNotesInGroup}
          onStashNotes={handleStashNotesInGroup}
          onLockNotes={handleLockNotesInGroup}
        />
      ))}

      {mapOpen && (
        <StickyMap 
          notes={notes} 
          groups={groups} 
          onJump={handleJump} 
          onClose={() => setMapOpen(false)} 
        />
      )}

      <SelectionToolbar
        selectedCount={selectedNoteIds.length}
        onStash={handleBulkStash}
        onFeedGoat={handleBulkDelete}
        onLock={() => handleBulkLock(true)}
        onUnlock={() => handleBulkLock(false)}
        onAlignLeft={handleAlignLeft}
        onAlignTop={handleAlignTop}
        onArrangeRow={handleArrangeRow}
        onArrangeColumn={handleArrangeColumn}
        onDistribute={handleDistribute}
        onUndoLayout={handleUndoLayout}
        canUndoLayout={!!layoutUndo}
        onColorChange={handleBulkColorChange}
        onGroup={handleCreateGroup}
        onClear={clearSelection}
      />

      <DropOverlay onFileDrop={handleFileDrop} onPathDrop={handlePathDrop} />

      <GoatTrash
        ref={goatRef}
        isActive={goatActive}
        isEating={goatEating}
        targetSize={goatTargetSize}
      />

      {quickAddOpen && (
        <QuickAddPanel
          defaultKind={quickAddKind}
          onSubmit={handleQuickAddSubmit}
          onClose={() => setQuickAddOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
