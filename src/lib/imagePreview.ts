import { convertFileSrc } from "@tauri-apps/api/core";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function isLikelyAbsolutePath(path: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(path)
    || path.startsWith("\\\\")
    || path.startsWith("//")
    || path.startsWith("/");
}

export function getImagePreviewSrc(path?: string, previewUrl?: string): string | undefined {
  if (!path && !previewUrl) return undefined;

  if (path && isTauri()) {
    if (isLikelyAbsolutePath(path)) {
      return convertFileSrc(path);
    }

    console.warn("[imagePreview] Image note path is not absolute; preview may fail.", { path });
  }

  return previewUrl;
}
