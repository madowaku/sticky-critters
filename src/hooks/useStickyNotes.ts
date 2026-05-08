import { useState, useEffect, useCallback, useRef } from "react";
import { loadAllNotes, loadAllGroups, saveAllNotes, createNoteDraft, migrateLocalStorageToFileIfNeeded } from "../lib/storage";
import type { StickyNote, NoteKind, NoteColor, NoteSize, NoteGroup, InkStroke, BundleItem } from "../types";
import { detectNoteKind } from "../lib/noteDetection";

export function useStickyNotes() {
  const [allNotes, setAllNotes] = useState<StickyNote[]>([]);
  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isInitialMount = useRef(true);

  // Initial async load
  useEffect(() => {
    async function init() {
      await migrateLocalStorageToFileIfNeeded();
      const [loadedNotes, loadedGroups] = await Promise.all([
        loadAllNotes(),
        loadAllGroups()
      ]);
      // Rescue notes that are out of bounds
      const normalized = normalizeNotePositions(loadedNotes);
      setAllNotes(normalized);
      setGroups(loadedGroups);
      setIsLoaded(true);
    }
    init();
  }, []);

  // Save to FS whenever notes change (skip initial mount and before load)
  useEffect(() => {
    if (isInitialMount.current || !isLoaded) {
      if (isLoaded) {
        isInitialMount.current = false;
      }
      return;
    }
    saveAllNotes(allNotes, groups);
  }, [allNotes, groups, isLoaded]);

  // Active notes: exclude those with deletedAt or stashedAt
  const notes = allNotes.filter((n) => !n.deletedAt && !n.stashedAt);

  const addNote = useCallback(
    (input: {
      body: string;
      kind?: NoteKind;
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
      inkStrokes?: InkStroke[];
      sketchBackground?: "plain" | "grid" | "lined";
      bundleItems?: BundleItem[];
    }) => {
      const kind = input.kind ?? detectNoteKind(input.body);
      
      let x = input.x;
      let y = input.y;
      
      if (x === undefined || y === undefined) {
        const step = notes.length % 10;
        const baseX = Math.max(40, window.innerWidth / 2 - 140);
        const baseY = Math.max(40, window.innerHeight / 2 - 100);
        x = x ?? (baseX + step * 24);
        y = y ?? (baseY + step * 24);
        
        if (x > window.innerWidth - 300) x = baseX;
        if (y > window.innerHeight - 200) y = baseY;
      }

      const draft = createNoteDraft({ ...input, kind, x, y });
      setAllNotes((prev) => [...prev, draft]);
      return draft;
    },
    [notes.length]
  );

  const updateNote = useCallback((id: string, partial: Partial<StickyNote>) => {
    setAllNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        // If locked, only allow unlocking
        if (n.locked && partial.locked === undefined) return n;
        return { 
          ...n, 
          ...partial, 
          lastInteractedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        };
      })
    );
  }, []);

  const createGroup = useCallback((noteIds: string[], title?: string) => {
    const targetNotes = allNotes.filter(n => noteIds.includes(n.id));
    if (targetNotes.length < 2) return;

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const now = new Date().toISOString();

    // Calculate bounding box
    const minX = Math.min(...targetNotes.map(n => n.x));
    const minY = Math.min(...targetNotes.map(n => n.y));
    const maxX = Math.max(...targetNotes.map(n => n.x + (n.size === "wide" ? 360 : 280)));
    const maxY = Math.max(...targetNotes.map(n => n.y + 160)); // Estimating height

    const newGroup: NoteGroup = {
      id,
      title: title || "Work set",
      collapsed: false,
      x: minX - 20,
      y: minY - 40,
      width: (maxX - minX) + 40,
      height: (maxY - minY) + 60,
      createdAt: now,
      updatedAt: now
    };

    setGroups(prev => [...prev, newGroup]);
    setAllNotes(prev => prev.map(n => 
      noteIds.includes(n.id) ? { ...n, groupId: id, updatedAt: now } : n
    ));
    
    return id;
  }, [allNotes]);

  const updateGroup = useCallback((id: string, partial: Partial<NoteGroup>) => {
    setGroups(prev => prev.map(g => 
      g.id === id ? { ...g, ...partial, updatedAt: new Date().toISOString() } : g
    ));
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    setAllNotes(prev => prev.map(n => 
      n.groupId === id ? { ...n, groupId: undefined, updatedAt: new Date().toISOString() } : n
    ));
  }, []);

  const moveGroup = useCallback((id: string, dx: number, dy: number) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== id) return g;
      return { ...g, x: g.x + dx, y: g.y + dy, updatedAt: new Date().toISOString() };
    }));
    setAllNotes(prev => prev.map(n => {
      if (n.groupId !== id) return n;
      if (n.locked) return n; // Keep locked notes in place
      return { ...n, x: n.x + dx, y: n.y + dy, updatedAt: new Date().toISOString() };
    }));
  }, []);

  const moveNote = useCallback((id: string, x: number, y: number) => {
    setAllNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        if (n.locked) return n;
        return { 
          ...n, 
          x, 
          y, 
          lastInteractedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        };
      })
    );
  }, []);

  const moveNotes = useCallback((ids: string[], dx: number, dy: number) => {
    setAllNotes((prev) =>
      prev.map((n) => {
        if (!ids.includes(n.id)) return n;
        if (n.locked) return n;
        return { 
          ...n, 
          x: n.x + dx, 
          y: n.y + dy, 
          lastInteractedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        };
      })
    );
  }, []);

  const updateNotes = useCallback((updates: { id: string; partial: Partial<StickyNote> }[]) => {
    setAllNotes((prev) => {
      let changed = false;
      const next = prev.map((n) => {
        const update = updates.find((u) => u.id === n.id);
        if (!update) return n;
        if (n.locked && update.partial.locked === undefined) return n;
        changed = true;
        return { 
          ...n, 
          ...update.partial, 
          lastInteractedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString() 
        };
      });
      return changed ? next : prev;
    });
  }, []);

  const deleteNote = useCallback(
    (id: string, by: "goat" | "manual" = "manual") => {
      setAllNotes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          if (n.locked) return n;
          return {
            ...n,
            deletedAt: new Date().toISOString(),
            deletedBy: by,
            groupId: undefined,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  const gatherNotes = useCallback(() => {
    setAllNotes((prev) => {
      const active = prev.filter((n) => !n.deletedAt);
      const deleted = prev.filter((n) => !!n.deletedAt);
      
      const baseX = Math.max(100, window.innerWidth / 2 - 200);
      const baseY = Math.max(100, window.innerHeight / 2 - 150);
      
      const gathered = active.map((n, i) => {
        if (n.locked) return n;
        return {
          ...n,
          x: baseX + i * 24,
          y: baseY + i * 24,
          collapsed: false,
          updatedAt: new Date().toISOString()
        };
      });
      
      return [...gathered, ...deleted];
    });
  }, []);

  const normalizeNotes = useCallback(() => {
    setAllNotes((prev) => normalizeNotePositions(prev));
  }, []);

  const importNotes = useCallback((imported: StickyNote[], mode: "merge" | "replace") => {
    setAllNotes((prev) => {
      if (mode === "replace") {
        return imported;
      }
      // Merge
      const newNotes = imported.map((n) => ({
        ...n,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      }));
      return [...prev, ...newNotes];
    });
  }, []);

  return { notes, allNotes, groups, addNote, updateNote, updateNotes, createGroup, updateGroup, deleteGroup, moveGroup, moveNote, moveNotes, deleteNote, isLoaded, gatherNotes, normalizeNotes, importNotes };
}

function normalizeNotePositions(notes: StickyNote[]): StickyNote[] {
  const margin = 40;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  return notes.map((n) => {
    if (n.deletedAt) return n;

    let { x, y } = n;
    let changed = false;

    // Minimum visible part
    if (x < 0) {
      x = margin;
      changed = true;
    }
    if (y < 0) {
      y = margin;
      changed = true;
    }
    if (x > screenWidth - 100) {
      x = screenWidth - 300;
      changed = true;
    }
    if (y > screenHeight - 100) {
      y = screenHeight - 200;
      changed = true;
    }

    if (changed) {
      return { ...n, x, y, updatedAt: new Date().toISOString() };
    }
    return n;
  });
}
