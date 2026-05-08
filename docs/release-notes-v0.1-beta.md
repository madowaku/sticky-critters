# Sticky Critters v0.1 Beta Release Notes

## 🐾 Welcome to Sticky Critters!

Sticky Critters is a "cute but powerful" desktop sticky note application designed for those who want to organize their thoughts, files, and sketches in a flexible workspace.

### What's New in v0.1 Beta
- **Versatile Note Types**: Memo, Code, URL, File, Folder, Image, and Sketch.
- **Sketching**: Built-in drawing canvas for freehand notes and diagrams.
- **Grouping**: Organize your notes into color-coded, collapsible groups.
- **Spatial Navigation**: A "Sticky Map" to overview and jump around your large workspace.
- **Temporal Navigation**: Recent Notes and Search History to quickly go back to what you were working on.
- **Organization**: "Hamster Pouch" (Stash) for temporary storage and "Goat Belly" (Trash) for recovery.
- **Productivity**: Alarm notifications (Alarm Chicken) and "Today Only" temporary notes.
- **Customization**: Dark/Light themes, density settings, and customizable global hotkeys.
- **Desktop Mode**: Borderless, click-through-capable mode for a truly integrated desktop experience.
- **Kangaroo Pocket**: Open a small drop target from the tray menu, then drop files, folders, or images to turn them into sticky notes.

### Added in v0.1.1 Beta
- **Bundle Note**: When multiple files, folders, or images are dropped together, Sticky Critters can collect them into one sticky note.
  - Each item can be opened or copied individually.
  - Folders open as folders, while images and files use the existing safe open guard.
  - Dangerous executable files remain blocked for safety.

### Safety First
- **No File Deletion**: We only manage links. Your original files are safe.
- **No Command Execution**: We don't run scripts or commands.
- **No Folder Crawling**: Folder notes store the path only. Sticky Critters does not automatically list, scan, or monitor folder contents.
- **Local First**: Your data stays on your machine (`notes.json` and `settings.json`).

### Kangaroo Pocket Notes
- Kangaroo Pocket is opened from the tray menu and appears as a small drop window near the lower-right corner of the screen.
- It accepts files, folders, and images, using the same safe note creation flow as dropping onto the main window.
- It is **not** direct drag-and-drop onto the tray icon.
- After a drop, Sticky Critters shows the main window. If Click-through was enabled, the app returns to Edit Mode so you can interact with the new notes.

### Known Issues & Roadmap
- See [Known Limitations](known-limitations.md) for current constraints.
- Future versions will include:
  - Sticky Links (connecting notes with lines)
  - PNG Export for sketches
  - More interaction mode refinements
  - Improved group auto-management

### How to Install
1. Download the `.msi` or `.exe` from the releases page (coming soon).
2. Run the installer.
3. Launch "Sticky Critters" from your Start menu.

---
*Thank you for trying out the beta! Stay sticky!* 🐾
