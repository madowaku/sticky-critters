import { useTranslation } from "../i18n/I18nContext";

export function FileDropTarget() {
  const { t } = useTranslation();

  return (
    <div className="file-drop-target" aria-hidden="true">
      <div className="file-drop-target__icon">📁</div>
      <div className="file-drop-target__text">{t("drop.targetTitle")}</div>
      <div className="file-drop-target__sub">{t("drop.targetSubtitle")}</div>
    </div>
  );
}
