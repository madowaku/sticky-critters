# Sticky Critters Distribution Checklist

## Release Artifacts

- Build command: `npm run tauri:build`
- OGP image command: `npm run assets:og`
- NSIS installer: `src-tauri/target/release/bundle/nsis/Sticky Critters_0.1.2_x64-setup.exe`
- MSI installer: optional; enable the MSI target only when WiX and Windows Installer Service are available.
- Attach the setup `.exe` to GitHub Releases.
- Add SHA256 checksums when publishing.

## Version And Identity

- `package.json`: `0.1.2`
- `src-tauri/tauri.conf.json`: `0.1.2`
- `src-tauri/Cargo.toml`: `0.1.2`
- Product name: `Sticky Critters`
- Identifier: `com.stickycritters.desktop`

## SmartScreen And Signing

- Current beta builds are unsigned.
- Windows SmartScreen may show a warning.
- Mention this clearly in README and release notes.
- For wider distribution, sign `app.exe` and installers with a code signing certificate.

## GitHub Release Steps

1. Run `npm run lint`.
2. Run `npm run build`.
3. Run `npm run assets:og`.
4. Run `npm run tauri:build`.
5. Test install on a clean Windows machine.
6. Create tag such as `v0.1.2-beta`.
7. Publish the setup `.exe` and checksum.
8. Paste release notes from `docs/release-notes-v0.1-beta.md`.
9. Mention that auto-update is not included in this beta.

## Public Assets

- Favicon: `public/favicon.png`
- App icon source: `public/brand-icon-goat-chicken.png`
- OGP source: `public/social-banner-teal.png`
- OGP PNG: `public/og-image.png`
- Demo plan: `docs/public-demo-plan.md`

## Update Policy

This beta does not include Tauri updater support. Users should install newer versions from GitHub Releases manually.
