/** Runs `attempt` now and again every `everyMs` until it returns true (Steam's modules may load late); the result cancels. */
export function keepTrying(attempt: () => boolean, everyMs: number): () => void {
    const tryOnce = () => { try { return attempt(); } catch { return false; } };
    if (tryOnce()) return () => {};
    const timer = setInterval(() => { if (tryOnce()) clearInterval(timer); }, everyMs);
    return () => clearInterval(timer);
}
