import { eyebrowText } from '../home/homeView';
import { formatLastPlayed } from '../home/recents';

type Overview = { appid?: number; display_name?: string; rt_last_time_played?: number };

/** The game card's header from Steam's app overview, worded as Home's eyebrow ("No play time" for a game never played); null when it is not a game. */
export function cardModel(overview: Overview | null | undefined, nowSeconds: number, locale: string): { appId: number; name: string; eyebrow: string } | null {
    const appId = overview?.appid;
    if (typeof appId !== 'number' || !(appId > 0)) return null;
    const played = overview?.rt_last_time_played;
    const label = typeof played === 'number' && played > 0 ? formatLastPlayed(played, nowSeconds, locale) : null;
    return { appId, name: typeof overview?.display_name === 'string' ? overview.display_name : '', eyebrow: eyebrowText(label, false, false, true) };
}
