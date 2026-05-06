import { emitTo } from "@tauri-apps/api/event";
import { LogicalPosition, currentMonitor, primaryMonitor } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isTauriDropAvailable, type DroppedPathInfo } from "./tauriDrop";

export const KANGAROO_POCKET_LABEL = "kangaroo-pocket";
export const KANGAROO_POCKET_OPEN_EVENT = "sticky-open-kangaroo-pocket";
export const KANGAROO_POCKET_DROP_EVENT = "sticky-kangaroo-pocket-drop";

const POCKET_WIDTH = 224;
const POCKET_HEIGHT = 164;
const POCKET_MARGIN = 18;

async function positionPocket(window: WebviewWindow) {
  const monitor = (await currentMonitor()) ?? (await primaryMonitor());
  if (!monitor) return;

  const scale = monitor.scaleFactor || 1;
  const workArea = monitor.workArea;
  const x = (workArea.position.x + workArea.size.width) / scale - POCKET_WIDTH - POCKET_MARGIN;
  const y = (workArea.position.y + workArea.size.height) / scale - POCKET_HEIGHT - POCKET_MARGIN;

  await window.setPosition(new LogicalPosition(x, y));
}

export async function openKangarooPocketWindow() {
  if (!isTauriDropAvailable()) return;

  const existing = await WebviewWindow.getByLabel(KANGAROO_POCKET_LABEL);
  if (existing) {
    await positionPocket(existing);
    await existing.show();
    await existing.setFocus();
    await existing.setAlwaysOnTop(true);
    return;
  }

  const pocket = new WebviewWindow(KANGAROO_POCKET_LABEL, {
    url: "/?view=kangaroo-pocket",
    title: "Kangaroo Pocket",
    width: POCKET_WIDTH,
    height: POCKET_HEIGHT,
    minWidth: 188,
    minHeight: 136,
    resizable: false,
    decorations: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    shadow: true,
    focus: true,
    visible: true,
  });

  pocket.once("tauri://created", async () => {
    try {
      await positionPocket(pocket);
    } catch (error) {
      console.warn("[kangaroo-pocket] Failed to position pocket window", error);
    }
  });

  pocket.once("tauri://error", (event) => {
    console.warn("[kangaroo-pocket] Failed to create pocket window", event.payload);
  });
}

export async function sendPocketDropToMain(infos: DroppedPathInfo[]) {
  await emitTo("main", KANGAROO_POCKET_DROP_EVENT, infos);
}
