import { useState } from "react";
import { useTranslation } from "../i18n/I18nContext";
import type { StorageInfo, DisplayMode, InteractionMode, LaunchBehavior, AppearanceSettings } from "../lib/storage";
import { DEFAULT_APPEARANCE } from "../lib/storage";
import { readBackupFile } from "../lib/backup";
import type { ExportData } from "../lib/backup";

interface Props {
  displayMode: DisplayMode;
  onSetDisplayMode: (mode: DisplayMode) => void;
  alwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  startAtLogin: boolean;
  onToggleAutostart: () => void;
  storageInfo: StorageInfo | null;
  interactionMode: InteractionMode;
  onSetInteractionMode: (mode: InteractionMode) => void;
  launchBehavior: LaunchBehavior;
  onSetLaunchBehavior: (behavior: LaunchBehavior) => void;
  appearance: AppearanceSettings;
  onSetAppearance: (next: AppearanceSettings) => void;
  hotkey: string;
  onUpdateHotkey: (newHotkey: string) => Promise<void>;
  onExport: () => Promise<void>;
  onImport: (data: ExportData, mode: "merge" | "replace") => Promise<void>;
  onClose: () => void;
}

type HotkeyPreset = {
  id: string;
  label: string;
  accelerator: string;
  warning?: boolean;
};

const HOTKEY_PRESETS: HotkeyPreset[] = [
  { id: "1", label: "Ctrl+Shift+Space", accelerator: "Ctrl+Shift+Space" },
  { id: "2", label: "Ctrl+Alt+Space", accelerator: "Ctrl+Alt+Space" },
  { id: "3", label: "Ctrl+Shift+N", accelerator: "Ctrl+Shift+N" },
  { id: "4", label: "Ctrl+Alt+N", accelerator: "Ctrl+Alt+N" },
  { id: "5", label: "Alt+Space", accelerator: "Alt+Space", warning: true },
];

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function SettingsDrawer({
  displayMode,
  onSetDisplayMode,
  alwaysOnTop,
  onToggleAlwaysOnTop,
  notificationsEnabled,
  onToggleNotifications,
  startAtLogin,
  onToggleAutostart,
  storageInfo,
  interactionMode,
  onSetInteractionMode,
  launchBehavior,
  onSetLaunchBehavior,
  appearance,
  onSetAppearance,
  hotkey,
  onUpdateHotkey,
  onExport,
  onImport,
  onClose,
}: Props) {
  const { t, locale, toggleLocale } = useTranslation();
  const [selectedHotkey, setSelectedHotkey] = useState(hotkey);
  const [isUpdating, setIsUpdating] = useState(false);
  const [importData, setImportData] = useState<ExportData | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      await onExport();
      alert(t("backup.exportDone"));
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message !== "Cancelled") {
        alert(message);
      }
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = async () => {
    try {
      setImporting(true);
      const data = await readBackupFile();
      setImportData(data);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message !== "Cancelled") {
        alert(t("backup.importFailed") + ": " + message);
      }
    } finally {
      setImporting(false);
    }
  };

  const executeImport = async (mode: "merge" | "replace") => {
    if (!importData) return;
    if (mode === "replace" && !confirm(t("backup.confirmReplace"))) {
      return;
    }
    
    try {
      await onImport(importData, mode);
      alert(t("backup.importDone"));
      setImportData(null);
    } catch (err: unknown) {
      alert(t("backup.importFailed") + ": " + getErrorMessage(err));
    }
  };

  const handleToggleInteraction = () => {
    if (displayMode !== "desktop") return;
    
    if (interactionMode === "edit") {
      const ok = window.confirm(t("interaction.passThroughWarning"));
      if (ok) {
        onSetInteractionMode("passThrough");
        onClose();
      }
    } else {
      onSetInteractionMode("edit");
    }
  };

  return (
    <div className="settings-drawer-overlay" onClick={onClose}>
      <div className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="settings-drawer__header">
          <h3 className="settings-drawer__title">⚙️ {t("settings.title")}</h3>
          <button className="settings-drawer__close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-drawer__content">
          <section className="settings-drawer__section">
            <h4 className="settings-drawer__section-title">{t("settings.display")}</h4>
            <div className="settings-drawer__row">
              <span>{t("settings.language")}</span>
              <button className="settings-drawer__btn" onClick={toggleLocale}>
                {locale === "ja" ? "日本語" : "English"}
              </button>
            </div>
            <div className="settings-drawer__row">
              <span>{t("settings.mode")}</span>
              <div className="settings-drawer__segmented">
                <button 
                  className={`settings-drawer__segmented-btn ${displayMode === "board" ? "active" : ""}`}
                  onClick={() => onSetDisplayMode("board")}
                >
                  Board
                </button>
                <button 
                  className={`settings-drawer__segmented-btn ${displayMode === "desktop" ? "active" : ""}`}
                  onClick={() => onSetDisplayMode("desktop")}
                >
                  Desktop
                </button>
              </div>
            </div>
            <div className="settings-drawer__row">
              <span>{t("settings.pin")}</span>
              <button 
                className={`settings-drawer__toggle ${alwaysOnTop ? "active" : ""}`}
                onClick={onToggleAlwaysOnTop}
              >
                {alwaysOnTop ? "ON" : "OFF"}
              </button>
            </div>
          </section>

          <section className="settings-drawer__section">
            <h4 className="settings-drawer__section-title">{t("appearance.title")}</h4>
            <div className="settings-drawer__row">
              <div className="settings-drawer__label-group" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("appearance.noteOpacity")}</span>
                  <span className="settings-drawer__value">{Math.round(appearance.noteOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.65"
                  max="1"
                  step="0.05"
                  value={appearance.noteOpacity}
                  onChange={(e) => onSetAppearance({ ...appearance, noteOpacity: parseFloat(e.target.value) })}
                  style={{ width: "100%", marginTop: "8px" }}
                />
              </div>
            </div>
            <div className="settings-drawer__row" style={{ marginTop: "8px" }}>
              <div className="settings-drawer__label-group" style={{ width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("appearance.fontScale")}</span>
                  <span className="settings-drawer__value">{Math.round(appearance.fontScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.25"
                  step="0.05"
                  value={appearance.fontScale}
                  onChange={(e) => onSetAppearance({ ...appearance, fontScale: parseFloat(e.target.value) })}
                  style={{ width: "100%", marginTop: "8px" }}
                />
              </div>
            </div>
            <div className="settings-drawer__row" style={{ marginTop: "8px" }}>
              <span>{t("appearance.noteCardSize")}</span>
              <div className="settings-drawer__segmented">
                <button
                  className={`settings-drawer__segmented-btn ${appearance.noteCardSize === "normal" ? "active" : ""}`}
                  onClick={() => onSetAppearance({ ...appearance, noteCardSize: "normal" })}
                >
                  {t("appearance.normal")}
                </button>
                <button
                  className={`settings-drawer__segmented-btn ${appearance.noteCardSize === "compact" ? "active" : ""}`}
                  onClick={() => onSetAppearance({ ...appearance, noteCardSize: "compact" })}
                >
                  {t("appearance.compact")}
                </button>
                <button
                  className={`settings-drawer__segmented-btn ${appearance.noteCardSize === "mini" ? "active" : ""}`}
                  onClick={() => onSetAppearance({ ...appearance, noteCardSize: "mini" })}
                >
                  {t("appearance.mini")}
                </button>
              </div>
            </div>
            <div className="settings-drawer__row" style={{ marginTop: "8px" }}>
              <span>{t("appearance.density")}</span>
              <div className="settings-drawer__segmented">
                <button 
                  className={`settings-drawer__segmented-btn ${appearance.density === "compact" ? "active" : ""}`}
                  onClick={() => onSetAppearance({ ...appearance, density: "compact" })}
                >
                  {t("appearance.compact")}
                </button>
                <button 
                  className={`settings-drawer__segmented-btn ${appearance.density === "comfortable" ? "active" : ""}`}
                  onClick={() => onSetAppearance({ ...appearance, density: "comfortable" })}
                >
                  {t("appearance.comfortable")}
                </button>
                <button 
                  className={`settings-drawer__segmented-btn ${appearance.density === "spacious" ? "active" : ""}`}
                  onClick={() => onSetAppearance({ ...appearance, density: "spacious" })}
                >
                  {t("appearance.spacious")}
                </button>
              </div>
            </div>

            <div className="settings-drawer__row" style={{ marginTop: "12px", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "12px" }}>
              <div className="settings-drawer__label-group">
                <span>{t("appearance.themeTitle")}</span>
              </div>
            </div>
            <div className="settings-drawer__row" style={{ marginTop: "4px" }}>
              <div className="settings-drawer__segmented" style={{ width: "100%" }}>
                <button 
                  className={`settings-drawer__segmented-btn ${appearance.colorTheme === "pastel" ? "active" : ""}`}
                  onClick={() => onSetAppearance({ ...appearance, colorTheme: "pastel" })}
                  title={t("appearance.pastelHint")}
                >
                  <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#fff9c4", border: "1px solid #ccc", marginRight: "4px" }}></span>
                  {t("appearance.pastel")}
                </button>
                <button 
                  className={`settings-drawer__segmented-btn ${appearance.colorTheme === "dark" ? "active" : ""}`}
                  onClick={() => onSetAppearance({ ...appearance, colorTheme: "dark" })}
                  title={t("appearance.darkHint")}
                >
                  <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#333", border: "1px solid #666", marginRight: "4px" }}></span>
                  {t("appearance.dark")}
                </button>
                <button 
                  className={`settings-drawer__segmented-btn ${appearance.colorTheme === "vivid" ? "active" : ""}`}
                  onClick={() => onSetAppearance({ ...appearance, colorTheme: "vivid" })}
                  title={t("appearance.vividHint")}
                >
                  <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#ffe45c", border: "1px solid #cc0", marginRight: "4px" }}></span>
                  {t("appearance.vivid")}
                </button>
                <button 
                  className={`settings-drawer__segmented-btn ${appearance.colorTheme === "mono" ? "active" : ""}`}
                  onClick={() => onSetAppearance({ ...appearance, colorTheme: "mono" })}
                  title={t("appearance.monoHint")}
                >
                  <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#e5e5e5", border: "1px solid #999", marginRight: "4px" }}></span>
                  {t("appearance.mono")}
                </button>
              </div>
            </div>
            <div className="settings-drawer__row" style={{ marginTop: "8px", justifyContent: "flex-end" }}>
              <button 
                className="settings-drawer__btn"
                onClick={() => onSetAppearance({ ...DEFAULT_APPEARANCE })}
              >
                {t("appearance.reset")}
              </button>
            </div>
          </section>

          <section className="settings-drawer__section">
            <h4 className="settings-drawer__section-title">{t("settings.behavior")}</h4>
            <div className="settings-drawer__row">
              <span>{t("notification.enabled")}</span>
              <button 
                className={`settings-drawer__toggle ${notificationsEnabled ? "active" : ""}`}
                onClick={onToggleNotifications}
              >
                {notificationsEnabled ? "ON" : "OFF"}
              </button>
            </div>
            <div className="settings-drawer__row">
              <span>{t("autostart.enabled")}</span>
              <button 
                className={`settings-drawer__toggle ${startAtLogin ? "active" : ""}`}
                onClick={onToggleAutostart}
              >
                {startAtLogin ? "ON" : "OFF"}
              </button>
            </div>
            <div className="settings-drawer__row" style={{ marginTop: "12px", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "12px" }}>
              <div className="settings-drawer__label-group">
                <span>{t("hotkey.title")}</span>
                <span className="settings-drawer__hint">{t("hotkey.restartHint")}</span>
              </div>
            </div>
            <div className="settings-drawer__row" style={{ marginTop: "4px" }}>
              <select 
                className="settings-drawer__select"
                value={selectedHotkey}
                onChange={(e) => setSelectedHotkey(e.target.value)}
                style={{ flex: 1, padding: "6px", borderRadius: "4px", border: "1px solid var(--goat-border)", background: "white", color: "var(--text-primary)" }}
              >
                {HOTKEY_PRESETS.map(p => (
                  <option key={p.id} value={p.accelerator}>
                    {p.label}{p.warning ? ` (${t("hotkey.conflictHint")})` : ""}
                  </option>
                ))}
              </select>
              <button 
                className={`settings-drawer__btn ${selectedHotkey !== hotkey ? "active" : ""}`}
                disabled={selectedHotkey === hotkey || isUpdating}
                onClick={async () => {
                  setIsUpdating(true);
                  try {
                    await onUpdateHotkey(selectedHotkey);
                  } catch {
                    setSelectedHotkey(hotkey);
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                style={{ marginLeft: "8px" }}
              >
                {isUpdating ? "..." : t("hotkey.apply")}
              </button>
            </div>
            {selectedHotkey === "Ctrl+Shift+Space" ? null : (
              <div style={{ marginTop: "8px", textAlign: "right" }}>
                <button 
                  className="settings-drawer__btn-text" 
                  onClick={() => {
                    setSelectedHotkey("Ctrl+Shift+Space");
                    onUpdateHotkey("Ctrl+Shift+Space");
                  }}
                  style={{ fontSize: "11px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}
                >
                  {t("hotkey.reset")}
                </button>
              </div>
            )}
            <div className="settings-drawer__row" style={{ marginTop: "8px" }}>
              <div className="settings-drawer__label-group">
                <span>{t("launch.title")}</span>
                <span className="settings-drawer__hint">
                  {launchBehavior === "show" ? t("launch.showHint") : t("launch.trayHint")}
                </span>
              </div>
              <div className="settings-drawer__segmented">
                <button 
                  className={`settings-drawer__segmented-btn ${launchBehavior === "show" ? "active" : ""}`}
                  onClick={() => onSetLaunchBehavior("show")}
                >
                  Show
                </button>
                <button 
                  className={`settings-drawer__segmented-btn ${launchBehavior === "tray" ? "active" : ""}`}
                  onClick={() => onSetLaunchBehavior("tray")}
                >
                  Tray
                </button>
              </div>
            </div>

            {/* Backup Section */}
            <div className="settings-drawer__row" style={{ marginTop: "12px", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "12px" }}>
              <div className="settings-drawer__label-group">
                <span>{t("backup.title")}</span>
              </div>
            </div>
            <div className="settings-drawer__row" style={{ marginTop: "4px", gap: "8px" }}>
              <button 
                className="settings-drawer__btn" 
                style={{ flex: 1 }}
                onClick={handleExport}
                disabled={exporting}
                title={t("backup.exportHint")}
              >
                📤 {t("backup.export")}
              </button>
              <button 
                className="settings-drawer__btn" 
                style={{ flex: 1 }}
                onClick={handleImportClick}
                disabled={importing}
                title={t("backup.importHint")}
              >
                📥 {t("backup.import")}
              </button>
            </div>
          </section>

          <section className="settings-drawer__section">
            <h4 className="settings-drawer__section-title">{t("advanced.title")}</h4>
            <div className="settings-drawer__row">
              <div className="settings-drawer__label-group">
                <span>{t("advanced.experimental")}: {t("interaction.passThrough")}</span>
                <span className="settings-drawer__hint">
                  {displayMode === "desktop" ? t("interaction.safetyHint") : t("interaction.desktopOnly")}
                </span>
              </div>
              <div className="settings-drawer__segmented">
                <button
                  className={`settings-drawer__segmented-btn ${interactionMode === "edit" ? "active" : ""}`}
                  onClick={() => onSetInteractionMode("edit")}
                >
                  Edit
                </button>
                <button
                  className={`settings-drawer__segmented-btn ${interactionMode === "passThrough" ? "active" : ""}`}
                  onClick={handleToggleInteraction}
                  disabled={displayMode !== "desktop"}
                >
                  Pass
                </button>
              </div>
            </div>
            <p className="settings-drawer__warning">
              ⚠️ {t("interaction.passThroughWarning")}
            </p>
          </section>

          {/* Storage Section */}
          {storageInfo && (
            <section className="settings-drawer__section">
              <h4 className="settings-drawer__section-title">{t("settings.storage")}</h4>
              <div className="settings-drawer__info">
                <div className="settings-drawer__info-item">
                  <label>{t("settings.storageMethod")}</label>
                  <span>{storageInfo.method}</span>
                </div>
                <div className="settings-drawer__info-item">
                  <label>{t("settings.notesPath")}</label>
                  <code title={storageInfo.notesPath}>{storageInfo.notesPath}</code>
                </div>
                <div className="settings-drawer__info-item">
                  <label>{t("settings.settingsPath")}</label>
                  <code title={storageInfo.settingsPath}>{storageInfo.settingsPath}</code>
                </div>
                <div className="settings-drawer__info-item">
                  <label>{t("settings.version")}</label>
                  <span>{storageInfo.schemaVersion}</span>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="settings-drawer__footer">
          <button className="settings-drawer__btn-close" onClick={onClose}>
            {t("settings.close")}
          </button>
        </div>
        {importData && (
          <div className="settings-drawer-overlay" style={{ zIndex: 11000, background: "rgba(0,0,0,0.6)", position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="settings-drawer" style={{ position: "relative", width: "320px", height: "auto", borderRadius: "12px", padding: "16px", background: "var(--drawer-bg)", transform: "none" }}>
              <h3 className="settings-drawer__title">📦 {t("backup.previewTitle")}</h3>
              
              <div style={{ marginTop: "16px", fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                <div><strong>Exported:</strong> {new Date(importData.exportedAt).toLocaleString()}</div>
                <div><strong>{t("backup.notesCount")}:</strong> {importData.notesData.notes.length}</div>
                <div><strong>{t("backup.settingsIncluded")}:</strong> {importData.settingsData ? "Yes" : "No"}</div>
              </div>

              <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <button 
                  className="settings-drawer__btn" 
                  style={{ width: "100%", padding: "8px", background: "var(--note-blue)" }}
                  onClick={() => executeImport("merge")}
                >
                  {t("backup.modeMerge")}
                </button>
                <button 
                  className="settings-drawer__btn" 
                  style={{ width: "100%", padding: "8px", background: "var(--note-pink)" }}
                  onClick={() => executeImport("replace")}
                >
                  {t("backup.modeReplace")}
                </button>
                <button 
                  className="settings-drawer__btn" 
                  style={{ width: "100%", padding: "8px", marginTop: "8px" }}
                  onClick={() => setImportData(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
