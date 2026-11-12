# Anatase Home frost update

## Scope

Issue #80. On the Anatase Steam Deck, both the Gamescope HDR feedback property and Steam's HDR fallback are absent. The shared frost context rejected Home geometry. Supplying a temporary Home-only fallback restored visible blur on the Deck. Allow the Home CSS path to proceed with missing HDR metadata. Preserve the in-game shader checks.

## Release sequence

1. Base the next 4.0 prerelease on the current rc.2 code, including the version picker fix. Review the frost context change and run the frontend suite, type check and build.
2. Package a test ZIP. On the Anatase Deck, verify visible Home blur through both menu buttons without the temporary fallback. Verify close and reopen. On the Ally, repeat the Home check in handheld and docked modes.
3. Once validated, bump to 4.0.0-rc.3, document the Home frost fix and the unchanged in-game requirements, rebuild the ZIP and record its SHA-256.
4. Prepare a GitHub draft prerelease with the exact tested commit and an explicit version tag. After review and publication, check that the stable Latest release stays stable and that the new RC appears under Show prereleases. Ask the issue reporter to verify Home blur on the Ally X and report in-game blur separately.
