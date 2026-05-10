# Sticky Critters v0.1 Beta Known Limitations

## UI / Interaction
- **Click-through Limitation**: In "Desktop Mode" with Click-through enabled, the application's own UI (buttons, drawers) cannot be clicked. You must use the Global Hotkey (default: `Ctrl+Shift+Space` or `F1`) or the Tray menu to return to "Edit Mode".
- **Multi-Monitor Support**: Window positioning might behave unexpectedly on certain multi-monitor setups when scaling differs significantly between screens.
- **Scroll in Desktop Mode**: Mouse wheel scrolling on the board might be intercepted by background windows in some environments.
- **Tray Drop Environments**: On the current Windows beta path, dropping files, folders, or images onto the tray can create notes. If a Windows shell or security policy blocks tray drop, use the main window drop fallback.
- **Mini Cards**: Mini note cards intentionally move most actions into the `...` menu. If an operation looks missing, open the menu or double-click the mini card for details.

## Note Specifics
- **Local Files**: In Browser Mode (development/web), full file paths cannot be retrieved due to security restrictions. Only the filename will be shown. Use the Tauri desktop app for full file path support.
- **Kangaroo Pocket**: The experimental pocket window code remains in the app, but the primary documented workflow is tray drop / main-window drop because the pocket window may not appear consistently on every Windows environment.
- **Image Previews**: If an image note is exported and then imported on another PC, the preview might fail if the original file path does not exist on the new PC.
- **Sketch Export**: Sketch notes cannot currently be exported as PNG/SVG files. They are saved as vector stroke data within the application.
- **Sketch Resizing**: Sketch notes can be resized, but the drawing toolbar and canvas keep a minimum usable area. Very small sketch cards are best used in mini/detail mode rather than as a full drawing surface.
- **Rich Text**: Notes are currently plain text or code snippets. Advanced formatting (Bold, Italic, Tables) within a note is not supported.

## Grouping
- **Nested Groups**: Groups cannot be placed inside other groups.
- **Group Sizing**: Group frames do not automatically expand when a note is moved near the edge; they must be manually resized or notes must be manually assigned.

## System
- **Real File Deletion**: Sticky Critters is designed to be a "Viewer/Launcher". It **never** deletes actual files on your hard drive. Deleting a "File Note" only removes the shortcut from the app.
- **Folder Contents**: Folder notes do not automatically enumerate, index, monitor, move, or delete anything inside the folder. They only store the folder path for opening/copying.
- **Performance**: Having more than 200-300 active notes on the board simultaneously might impact performance depending on your GPU/CPU. Use the "Stash" (ほっぺ袋) to organize less-used items.
- **Backup**: There is no automatic cloud sync. Please use the "Export Data" feature in Settings to backup your notes manually.
