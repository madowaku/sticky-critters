import { isDangerousExecutable } from "./pathUtils";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Open a URL in a new tab or default browser.
 */
export async function openUrl(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) {
    console.warn("[openers] Only http/https URLs allowed:", url);
    return;
  }
  
  if (isTauri()) {
    try {
      const { openUrl: tauriOpenUrl } = await import("@tauri-apps/plugin-opener");
      await tauriOpenUrl(url);
    } catch (e) {
      console.error("[openers] Tauri openUrl failed:", e);
    }
  } else {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      console.warn("[openers] Failed to open URL:", url);
    }
  }
}

/**
 * Open a file path.
 */
export async function openFilePath(path: string | undefined): Promise<void> {
  if (!path) {
    console.warn("[openers] No path provided");
    return;
  }
  if (isDangerousExecutable(path)) {
    console.warn("[openers] BLOCKED: dangerous executable:", path);
    return;
  }
  // TODO: Phase 2 - Add backend-side safety guards to prevent opening dangerous files 
  // even if the frontend check is bypassed.
  
  if (isTauri()) {
    try {
      const { openPath } = await import("@tauri-apps/plugin-opener");
      await openPath(path);
    } catch (e) {
      console.error("[openers] Tauri openPath failed:", e);
    }
  } else {
    console.warn(
      "[openers] File open is not available in browser mode. Path:",
      path
    );
  }
}

/**
 * Open a folder path. Same constraints as openFilePath.
 * Uses openPath to open the folder itself in the Explorer.
 */
export async function openFolderPath(path: string | undefined): Promise<void> {
  if (!path) {
    console.warn("[openers] No path provided");
    return;
  }
  
  if (isTauri()) {
    try {
      const { openPath } = await import("@tauri-apps/plugin-opener");
      await openPath(path);
    } catch (e) {
      console.error("[openers] Tauri openPath (folder) failed:", e);
    }
  } else {
    console.warn(
      "[openers] Folder open is not available in browser mode. Path:",
      path
    );
  }
}

/**
 * Check if a path can be opened.
 * Returns true if in Tauri environment, false in browser mode.
 */
export function canOpenPath(path: string | undefined): boolean {
  if (!path) return false;
  if (isDangerousExecutable(path)) return false;
  if (isTauri()) return true;
  return false;
}

export function canOpenFolderPath(path: string | undefined): boolean {
  if (!path) return false;
  if (isTauri()) return true;
  return false;
}
