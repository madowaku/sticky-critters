use std::str::FromStr;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(serde::Serialize)]
struct DroppedPathInfo {
    path: String,
    name: String,
    kind: String,
    extension: Option<String>,
    #[serde(rename = "isImage")]
    is_image: bool,
}

#[tauri::command]
fn update_hotkey(
    app: tauri::AppHandle,
    old_hotkey: Option<String>,
    new_hotkey: String,
) -> Result<(), String> {
    let shortcut_manager = app.global_shortcut();

    // Unregister old if provided
    if let Some(old) = old_hotkey {
        if let Ok(old_shortcut) = Shortcut::from_str(&old) {
            let _ = shortcut_manager.unregister(old_shortcut);
        }
    }

    // Register new
    let new_shortcut =
        Shortcut::from_str(&new_hotkey).map_err(|e| format!("Invalid hotkey format: {}", e))?;

    shortcut_manager
        .register(new_shortcut)
        .map_err(|e| format!("Failed to register hotkey: {}", e))?;

    Ok(())
}

#[tauri::command]
fn get_dropped_path_info(paths: Vec<String>) -> Vec<DroppedPathInfo> {
    paths
        .into_iter()
        .map(|path| {
            let path_buf = std::path::PathBuf::from(&path);
            let name = path_buf
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or(&path)
                .to_string();
            let extension = path_buf
                .extension()
                .and_then(|value| value.to_str())
                .map(|value| value.to_ascii_lowercase());
            let kind = match std::fs::metadata(&path) {
                Ok(metadata) if metadata.is_dir() => "folder",
                Ok(metadata) if metadata.is_file() => "file",
                _ => "unknown",
            }
            .to_string();
            let is_image = kind == "file"
                && extension.as_deref().is_some_and(|ext| {
                    matches!(ext, "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "svg")
                });

            DroppedPathInfo {
                path,
                name,
                kind,
                extension,
                is_image,
            }
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                window.hide().unwrap();
            }
            _ => {}
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // --- Global Shortcut Plugin ---
            // We register the plugin with a handler that reacts to ANY registered shortcut.
            // Since we only register one at a time for this app's main action, this works.
            app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |app, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            if let Some(window) = app.get_webview_window("main") {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                                window.set_ignore_cursor_events(false).unwrap();
                                window.emit("sticky-force-edit", ()).unwrap();
                            }
                        }
                    })
                    .build(),
            )?;

            // --- System Tray ---
            use tauri::{
                menu::{Menu, MenuItem},
                tray::TrayIconBuilder,
            };
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let toggle_mode_i = MenuItem::with_id(
                app,
                "toggle_mode",
                "Toggle Desktop Mode",
                true,
                None::<&str>,
            )?;
            let always_on_top_i = MenuItem::with_id(
                app,
                "always_on_top",
                "Toggle Always on Top",
                true,
                None::<&str>,
            )?;
            let gather_notes_i =
                MenuItem::with_id(app, "gather_notes", "Gather notes", true, None::<&str>)?;
            let new_note_i = MenuItem::with_id(app, "new_note", "New Note", true, None::<&str>)?;
            let return_to_edit_i = MenuItem::with_id(
                app,
                "return_to_edit",
                "Return to Edit Mode",
                true,
                None::<&str>,
            )?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &show_i,
                    &hide_i,
                    &toggle_mode_i,
                    &always_on_top_i,
                    &gather_notes_i,
                    &new_note_i,
                    &return_to_edit_i,
                    &quit_i,
                ],
            )?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.hide().unwrap();
                        }
                    }
                    "toggle_mode" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                            window.emit("sticky-toggle-display-mode", ()).unwrap();
                        }
                    }
                    "always_on_top" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.emit("sticky-toggle-always-on-top", ()).unwrap();
                        }
                    }
                    "gather_notes" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                            window.emit("sticky-gather-notes", ()).unwrap();
                        }
                    }
                    "new_note" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                            window.emit("sticky-new-note", ()).unwrap();
                        }
                    }
                    "return_to_edit" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                            window.set_ignore_cursor_events(false).unwrap();
                            window.emit("sticky-force-edit", ()).unwrap();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                window.hide().unwrap();
                            } else {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![update_hotkey, get_dropped_path_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
