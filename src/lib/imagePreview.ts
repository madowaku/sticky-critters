import { convertFileSrc } from "@tauri-apps/api/core";

export function getImagePreviewSrc(path?: string, previewUrl?: string): string | undefined {
  if (!path && !previewUrl) return undefined;

  // Tauri environment
  if (path && typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    // Only convert if it's an absolute path (Likely on Windows start with C:\ or similar)
    if (/^[a-zA-Z]:\\/.test(path) || path.startsWith("/")) {
      return convertFileSrc(path);
    }
  }

  // Browser fallback or newly dropped image
  return previewUrl;
}
