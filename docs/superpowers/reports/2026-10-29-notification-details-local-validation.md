# Notification details — local validation (2026-10-29)

User approved correcting generic notification labels. The existing reader understood wishlist-sale JSON and discarded the presentation of other types. Prior authorised read-only Ally probes established the current tray contained download-completion protobuf payloads and Decky/plugin notifications alongside wishlist sales. No personal notification title, body, game name or identifier was exported in the probes or fixtures.

## Correction

- Steam eType 1 uses source-verified CClientNotificationDownloadCompleted getters: appid(), dlc_appid(), remote_client_name(). The reader calls these with their receiver, resolves cached library/DLC names, and shows Download complete, the game name and readiness/remote-device information. Missing metadata retains a meaningful completion fallback; broken getters are isolated.
- Steam eType 31 carries plugin title/body and nNotificationID. Plain text and supplied React translation elements are retained. Unsupported objects/functions are omitted without invocation while reading. Plugin IDs are namespaced against Steam IDs.
- List change detection compares primitive metadata and immutable content references rather than serializing React owners, which can contain cycles. Unchanged snapshots do not emit.
- The existing row layout gains a wrapping body line. Non-wishlist actions continue to open Steam's notification tab. Sale metadata requests remain wishlist-only. Unknown notification types keep the generic fallback; wishlist handling and unread-state semantics are preserved. No native notification callbacks are invoked or notifications marked read by parsing.

## Evidence

- RED: eight new cases failed before product changes.
- GREEN: focused20, full2,329 frontend tests across203 files; typecheck, Rollup build and diff check passed.
- Regressions cover native receiver/getter failures, game/DLC names, remote status, plugin strings/rich elements, invalid content, ID separation, cyclic React owners, stable/change emission, details rendering and existing click destinations.
- Chromium checks at1500×845 and829×467 used actual hook-free NotificationsContents and production styles with synthetic data. Five rows cover local/remote downloads, plain/rich plugin content and an unknown type. Body text and synthetic translated content appeared, long text wrapped, no horizontal overflow or page errors. Screenshots inspected. Requests were intercepted locally.
- The fixture uses native DOM representations of Decky controls and a synthetic translation component; it does not mount Steam React lifecycle or prove Decky's actual translation-context rendering.
- Independent scoped review found no actionable correctness findings.

Logs: `/private/tmp/gg-notification-details-{red,green,suite,types,build,browser}.log`. Browser fixture: `.superpowers/sdd/2026-10-29-notification-details/`.

## Device boundary

The user said they are playing and requested care with the Ally. After that message, all work stayed local: no further device access, installation, reload, navigation, notification activation or acknowledgement. The installed Ally build remains Social heroes `0e20b69`. Ask before any further access or installation. Frontend-only installation can follow explicit approval when the user is ready; back up the existing frontend, require the side menu closed, verify the checksum, then reload. Reload clears unsent Social drafts; no system reboot is needed.

Pending device validation: real game/DLC names, actual supplied Decky translation elements in the menu, row layout/controller navigation, and retained native notification actions.

Built `dist/index.js` SHA-256: `1a6ca5e160706fa016150c5f3cb63e21cab894577e6e415641a904400c84f0b6`.
