import { invoke } from "@tauri-apps/api/core";

export type DroppedPathKind = "file" | "folder" | "unknown";

export type DroppedPathInfo = {
  path: string;
  name: string;
  kind: DroppedPathKind;
  extension?: string;
  isImage: boolean;
};

export type TauriDropHandlers = {
  onEnter?: () => void;
  onOver?: () => void;
  onLeave?: () => void;
  onDrop: (infos: DroppedPathInfo[]) => void;
  onError?: (error: unknown) => void;
};

export function isTauriDropAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getDroppedPathInfo(paths: string[]): Promise<DroppedPathInfo[]> {
  return invoke<DroppedPathInfo[]>("get_dropped_path_info", { paths });
}

export async function listenTauriDrop({
  onEnter,
  onOver,
  onLeave,
  onDrop,
  onError,
}: TauriDropHandlers): Promise<() => void> {
  if (!isTauriDropAvailable()) return () => undefined;

  const { getCurrentWebview } = await import("@tauri-apps/api/webview");
  return getCurrentWebview().onDragDropEvent(async (event) => {
    if (event.payload.type === "enter") {
      onEnter?.();
      return;
    }

    if (event.payload.type === "over") {
      onOver?.();
      return;
    }

    if (event.payload.type === "leave") {
      onLeave?.();
      return;
    }

    if (event.payload.type !== "drop") return;

    try {
      onDrop(await getDroppedPathInfo(event.payload.paths));
    } catch (error) {
      onError?.(error);
    }
  });
}
