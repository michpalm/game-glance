import { callable } from '@decky/api';

const getStore = callable<[appid: number], string | null>('get_store');
const memo = new Map<number, Promise<string>>();

export function getSourceLabel(
    appId: number,
    isShortcut: boolean,
    lookup: (appId: number) => Promise<string | null> = getStore,
    fallback: string | null = null, // e.g. the Heroic store, when Unifideck has no record
): Promise<string> {
    const otherwise = fallback ?? 'Non-Steam';
    if (!isShortcut) return Promise.resolve('Steam');
    let pending = memo.get(appId);
    if (!pending) {
        pending = lookup(appId)
            .then((label) => (typeof label === 'string' && label.length > 0 ? label : otherwise))
            .catch(() => {
                memo.delete(appId); // backend not ready yet: try again next time
                return otherwise;
            });
        memo.set(appId, pending);
    }
    return pending;
}
