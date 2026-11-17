import { describe, expect, it } from 'vitest';
import { storageStyles } from '../../src/storage/storageStyles';
import { IDLE_TILE, unit } from '../../src/styles/tokens';

const rule = (selectorPart: string) => storageStyles.split('\n').find(line => line.includes(selectorPart) && line.includes('{')) ?? '';

describe('storageStyles', () => {
    it('beats Steam\'s focused-button colours: the focused row and card keep white text on the strong glass', () => {
        const focused = rule('button.gg-storage-row.DialogButton:is(.gpfocus');
        expect(focused).toContain('button.gg-storage-card.DialogButton:is(.gpfocus');
        expect(focused).toContain('background:var(--gg-glass-strong)');
        expect(focused).toContain('color:var(--gg-text)');
        // The menu's ring: a fixed 2 px, not scaled with the page, so it stays visible on the Deck's smaller screen.
        expect(focused).toContain('outline:2px solid #fff');
    });
    it('leaves the scrolling list room for the whole ring (2 px offset + 2 px width), without moving the rows', () => {
        const list = rule('.gg-storage-list{');
        expect(list).toContain('padding:6px');
        expect(list).toContain('margin:-6px');
    });
    it('draws the games list large enough for a handheld (Michael, 2026-11-17: "a bit bigger")', () => {
        expect(rule('.gg-storage-name{')).toContain(`font-size:${unit(30)}`);
        expect(rule('.gg-storage-status{')).toContain(`font-size:${unit(21)}`);
        expect(rule('.gg-storage-size{')).toContain(`font-size:${unit(28)}`);
        expect(rule('.gg-storage-art{')).toContain(`width:${unit(168)};height:${unit(79)}`);
        expect(rule('button.gg-storage-row.DialogButton{')).toContain(`min-height:${unit(108)}`);
    });
    it('draws the drive cards\' small lines to match the list (Michael, 2026-11-17)', () => {
        expect(rule('.gg-storage-card-line,')).toContain(`font-size:${unit(21)}`);
        expect(rule('.gg-storage-card-name{')).toContain(`font-size:${unit(26)}`);
        expect(rule('.gg-storage-card-name svg{')).toContain(`width:${unit(26)};height:${unit(26)}`);
    });
    it('draws idle tiles with the menu\'s soft edge and tint, not a hard border', () => {
        const idle = rule('button.gg-storage-row.DialogButton:not(');
        expect(idle).toContain(IDLE_TILE.edge);
        expect(idle).toContain(IDLE_TILE.tint);
        expect(storageStyles).not.toContain('rgba(255,255,255,.75)');
        expect(storageStyles).not.toContain('all:unset');
    });
});
