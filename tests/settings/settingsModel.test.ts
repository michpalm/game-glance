import { describe, expect, it } from 'vitest';
import { closedPreview, entriesOf, GROUPS, jumpGroup, moveFocus, steamRoute } from '../../src/settings/settingsModel';

describe('settings list', () => {
    it('five groups, 21 entries, in the spec order', () => {
        expect(GROUPS.map(g => g.name)).toEqual(['Device', 'Games', 'People', 'You', 'System']);
        expect(GROUPS.flatMap(g => g.entries)).toHaveLength(21);
        expect(entriesOf('Device').map(e => e.name)).toEqual(['Display', 'Sound', 'Bluetooth', 'Controllers', 'Keyboard', 'Power and sleep']);
        expect(entriesOf('Games').map(e => e.name)).toEqual(['In-game', 'Game recording', 'Compatibility', 'Downloads', 'Cloud', 'Remote Play']);
    });
    it('up and down cross groups and stop at the ends', () => {
        expect(moveFocus('power', 'down')).toBe('ingame');
        expect(moveFocus('ingame', 'up')).toBe('power');
        expect(moveFocus('sound', 'down')).toBe('bluetooth');
        expect(moveFocus('display', 'up')).toBe('display');
        expect(moveFocus('security', 'down')).toBe('security');
    });
    it('L1/R1 jump to a group\'s first entry and wrap', () => {
        expect(jumpGroup('bluetooth', 1)).toBe('ingame');
        expect(jumpGroup('display', -1)).toBe('system');
        expect(jumpGroup('security', 1)).toBe('display');
        expect(jumpGroup('cloud', -1)).toBe('display');
    });
    it('a closed group lists its entries', () => {
        expect(closedPreview('People')).toBe('Friends and chat · Family · Notifications');
    });
    it("each entry's Steam page (Review Focus 3)", () => {
        expect(steamRoute('sound', null)).toBe('/settings/audio');
        expect(steamRoute('recording', null)).toBe('/settings/gamerecording');
        expect(steamRoute('compat', null)).toBe('/settings/compatibility');
        expect(steamRoute('cloud', null)).toBe('/settings/cloud');
        expect(steamRoute('controllers', { type: 30, index: 0 })).toBe('/settings/controller/30/0');
        expect(steamRoute('controllers', null)).toBe('/settings/controller');
    });
});
