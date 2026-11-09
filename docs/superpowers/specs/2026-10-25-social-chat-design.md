# Embedded Social chat design

Approved for implementation by the user's “go ahead” on 25 October 2026, following the investigation and Social concept.

Implement live Steam friends in a 30/70 friends/conversation split, with embedded one-to-one history and text messaging. Use Steam's native keyboard and chat sending pipeline, preserving filtering/escaping and delivery/error states. Keep Open in Steam available.

Preview a friend without creating or acknowledging a conversation. Explicit entry owns one native chat-view registration and loads history. Only a visible, focused, entered conversation at the latest messages acknowledges reads; hidden/scrolled-up views do not. B closes the keyboard first, then leaves the conversation for the friends list, then closes the menu.

Account changes, friend removal, blocked/parental state and offline/disconnected stores invalidate pending work. Drafts remain in memory and account-scoped. Native sends may resolve on failure, so observe their local echoes/queue status rather than equating a resolved promise with success. Do not duplicate pending sends or implement a second persistent queue.

History is bounded in the presentation and pages on request. Use safe text rendering and preserve Steam filtering; unsupported rich content has a native-view path. Initial scope excludes groups, voice and uploads.

Use the approved visual language for the new panel: dark glass, 16 body size, 12 row/card corners, pill actions, white focus ring with accent glow. Presence colors keep their existing meaning. Do not migrate unrelated menu styles or unfinished accent changes.

Implement locally on a separate branch based on the floating-menu committed tip. No actual messages or read acknowledgments during tests; synthetic data only. No device installation, push, PR or release is authorized by this implementation request.

Reference investigation: /Users/micpaal/.codex/visualizations/2026/10/25/01a174ca-7ab2-7ec3-a6a1-3c0d37b9f207/social-embedded-chat-investigation.md

