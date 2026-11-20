import { describe, expect, it } from 'vitest';
import { cardModel } from '../../src/contextMenus/cardModel';
import { eyebrowText } from '../../src/home/homeView';
import { formatLastPlayed } from '../../src/home/recents';

const now = 1_800_000_000;
describe('cardModel', () => {
    it('names a played game and says when, as Home does', () => {
        const t = now - 3 * 86_400;
        expect(cardModel({ appid: 620, display_name: 'Portal 2', rt_last_time_played: t }, now, 'en'))
            .toEqual({ appId: 620, name: 'Portal 2', eyebrow: eyebrowText(formatLastPlayed(t, now, 'en'), false) });
    });
    it('says No play time for a game never played', () => {
        expect(cardModel({ appid: 620, display_name: 'Portal 2', rt_last_time_played: 0 }, now, 'en')?.eyebrow).toBe(eyebrowText(null, false, false, true));
    });
    it('is null without a game', () => {
        expect(cardModel(null, now, 'en')).toBeNull();
        expect(cardModel(undefined, now, 'en')).toBeNull();
        expect(cardModel({ display_name: 'x' }, now, 'en')).toBeNull();
        expect(cardModel({ appid: 0 }, now, 'en')).toBeNull();
    });
    it('has an empty name when Steam gives none', () => {
        expect(cardModel({ appid: 620 }, now, 'en')?.name).toBe('');
    });
});
