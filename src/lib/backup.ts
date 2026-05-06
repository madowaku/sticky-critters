import type { StickyNote } from "../types";
import type { AppSettings } from "./storage";

export interface ExportData {
  app: string;
  exportVersion: number;
  exportedAt: string;
  notesData: {
    schemaVersion: number;
    notes: StickyNote[];
  };
  settingsData: AppSettings;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function exportBackup(notes: StickyNote[], settings: AppSettings): Promise<void> {
  const data: ExportData = {
    app: "Sticky Critters",
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    notesData: {
      schemaVersion: 1, // Assuming notes schema is 1
      notes,
    },
    settingsData: settings,
  };

  const jsonStr = JSON.stringify(data, null, 2);
  const defaultFilename = `sticky-critters-backup-${new Date().toISOString().split('T')[0]}.json`;

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    
    const filePath = await save({
      filters: [{ name: "JSON", extensions: ["json"] }],
      defaultPath: defaultFilename,
    });

    if (filePath) {
      await writeTextFile(filePath, jsonStr);
    } else {
      throw new Error("Cancelled");
    }
  } else {
    // Browser fallback
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export async function readBackupFile(): Promise<ExportData> {
  let text: string;

  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");

    const selected = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!selected) {
      throw new Error("Cancelled");
    }

    const filePath = Array.isArray(selected) ? selected[0] : selected;
    text = await readTextFile(filePath);
  } else {
    text = await new Promise<string>((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error("Cancelled"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
      };
      input.click();
    });
  }

  const data = JSON.parse(text) as ExportData;
  if (data.app !== "Sticky Critters") {
    throw new Error("Invalid format: Not a Sticky Critters backup");
  }

  return data;
}
