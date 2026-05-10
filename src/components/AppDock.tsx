import { useTranslation } from "../i18n/I18nContext";

interface Props {
  onOpenQuickAdd: (kind?: "plain" | "code") => void;
  onClipboardAdd: () => void;
  onGatherNotes: () => void;
  onOpenGoatBelly: () => void;
  onOpenStashDrawer: () => void;
  onOpenSearchDrawer: () => void;
  onOpenSettingsDrawer: () => void;
  onMapToggle: () => void;
  onAddSketch: () => void;
  mapOpen: boolean;
  clipboardError?: string;
}

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function handleHide() {
  if (!isTauri) { console.warn("hide: not in Tauri"); return; }
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().hide();
  } catch (e) { console.warn("Failed to hide window", e); }
}

async function handleMinimize() {
  if (!isTauri) { console.warn("minimize: not in Tauri"); return; }
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  } catch (e) { console.warn("Failed to minimize window", e); }
}

export function AppDock({
  onOpenQuickAdd,
  onClipboardAdd,
  onGatherNotes,
  onOpenGoatBelly,
  onOpenStashDrawer,
  onOpenSearchDrawer,
  onOpenSettingsDrawer,
  onMapToggle,
  onAddSketch,
  mapOpen,
  clipboardError,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="app-dock" data-tauri-drag-region>
      {/* Row 1: Brand + Main Actions */}
      <div className="app-dock__row app-dock__row--main" data-tauri-drag-region>
        <div className="app-dock__brand" data-tauri-drag-region>
          <span className="app-dock__logo">🐾</span>
          <span className="app-dock__title">{t("dock.title")}</span>
        </div>
        <div className="app-dock__grip" data-tauri-drag-region>⠿</div>
        <div className="app-dock__actions">
          <button
            className="app-dock__btn app-dock__btn--text"
            onClick={() => onOpenQuickAdd()}
            title={t("dock.text")}
            aria-label={t("dock.text")}
          >
            <span className="app-dock__btn-icon">📝</span>
            {t("dock.text")}
          </button>
          <button
            className="app-dock__btn app-dock__btn--code"
            onClick={() => onOpenQuickAdd("code")}
            title={t("dock.code")}
            aria-label={t("dock.code")}
          >
            <span className="app-dock__btn-icon">💻</span>
            {t("dock.code")}
          </button>
          <button
            className="app-dock__btn app-dock__btn--sketch"
            onClick={onAddSketch}
            title={t("dock.sketch")}
            aria-label={t("dock.sketch")}
          >
            <span className="app-dock__btn-icon">✍️</span>
            {t("dock.sketch")}
          </button>
          <button
            className="app-dock__btn app-dock__btn--clipboard"
            onClick={onClipboardAdd}
            title={t("dock.clipboard")}
            aria-label={t("dock.clipboard")}
          >
            <span className="app-dock__btn-icon">📋</span>
            {t("dock.clipboard")}
          </button>
          {clipboardError && (
            <span
              className="app-dock__error"
            >
              {clipboardError}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Utility actions */}
      <div className="app-dock__row app-dock__row--util" data-tauri-drag-region>
        <div className="app-dock__actions">
          <button
            className="app-dock__btn app-dock__btn--sm"
            onClick={onOpenSearchDrawer}
            title={t("search.title")}
            aria-label={t("search.title")}
          >
            🔍
          </button>
          <button
            className="app-dock__btn app-dock__btn--sm"
            onClick={onOpenStashDrawer}
            title={t("stash.title")}
            aria-label={t("stash.title")}
          >
            🐹
          </button>
          <button
            className="app-dock__btn app-dock__btn--sm"
            onClick={onOpenGoatBelly}
            title={t("goatBelly.title")}
            aria-label={t("goatBelly.title")}
          >
            🐐
          </button>
          <button
            className={`app-dock__btn app-dock__btn--sm ${mapOpen ? "app-dock__btn--active" : ""}`}
            onClick={onMapToggle}
            title={t("map.title")}
            aria-label={t("map.title")}
          >
            🗺️
          </button>
          <button
            className="app-dock__btn app-dock__btn--sm"
            onClick={onOpenSettingsDrawer}
            title={t("settings.title")}
            aria-label={t("settings.title")}
          >
            ⚙️
          </button>
        </div>

        <div className="app-dock__actions">
          <button
            className="app-dock__btn app-dock__btn--sm"
            onClick={onGatherNotes}
            title={t("action.gatherNotes")}
            aria-label={t("action.gatherNotes")}
          >
            🎯
          </button>
          
          <div className="app-dock__sep" />

          <button
            className="app-dock__btn app-dock__btn--win"
            onClick={handleMinimize}
            title={t("window.minimize")}
            disabled={!isTauri}
          >
            ─
          </button>
          <button
            className="app-dock__btn app-dock__btn--win"
            onClick={handleHide}
            title={`${t("window.closeToTray")} / ${t("tray.dropHint")}`}
            disabled={!isTauri}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
