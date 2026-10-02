/** A game Heroic Games Launcher added to Steam: its runner (store backend) and the store's own game id. */
export interface HeroicRef {
    runner: string;
    appName: string;
}

const RUNNER_LABELS: Record<string, string> = { gog: 'GOG', legendary: 'Epic', nile: 'Amazon', sideload: 'Heroic' };

function decode(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/**
 * Reads the Heroic link from a Steam shortcut's launch options:
 * `heroic://launch?appName=<id>&runner=<runner>` (current) or `heroic://launch/<runner>/<id>` (older).
 */
export function parseHeroicLaunch(launchOptions: string | undefined | null): HeroicRef | null {
    if (typeof launchOptions !== 'string') return null;
    const link = launchOptions.match(/heroic:\/\/launch([^\s"']*)/)?.[1];
    if (link === undefined) return null;
    if (link.startsWith('?')) {
        const params = new Map(
            link.slice(1).split('&').map((pair) => {
                const at = pair.indexOf('=');
                return at < 0 ? [pair, ''] : [pair.slice(0, at), decode(pair.slice(at + 1))];
            }),
        );
        const runner = params.get('runner');
        const appName = params.get('appName');
        return runner && appName ? { runner, appName } : null;
    }
    const path = link.match(/^\/([^/]+)\/([^/?]+)/);
    return path ? { runner: decode(path[1]), appName: decode(path[2]) } : null;
}

export function heroicStoreLabel(ref: HeroicRef | null): string | null {
    if (!ref) return null;
    return RUNNER_LABELS[ref.runner.toLowerCase()] ?? 'Heroic';
}
