import { describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';

vi.mock('@decky/ui', () => ({ Focusable: () => null, Menu: () => null, MenuItem: () => null, showContextMenu: vi.fn() }));
vi.mock('../../src/data/settings', () => ({ useSettings: () => ({ enabled: true }) }));
vi.mock('../../src/home/mode', () => ({ homeMode: () => ({ restyleDetails: true }) }));
vi.mock('../../src/styles/theme', () => ({ appButtonsSelector: () => null }));

const { parkNsl } = await import('../../src/components/ThemeMusicButton');
const { NSL_IDS } = await import('../../src/data/themeMusic');

function page() {
    const nsl = Object.values(NSL_IDS).map((id) => `<div id="${id}"></div>`).join('');
    return parseHTML(`<html><body><div class="gh-actions">${nsl}<div class="pad"></div><div class="gear"></div></div></body></html>`).document;
}

describe('parkNsl (NSL’s buttons out of every row)', () => {
    it('moves all five of NSL’s elements into one hidden holder in <body>, keeping the row’s own children in order', () => {
        const doc = page();
        const music = doc.getElementById(NSL_IDS.music);
        expect(parkNsl(doc)).toBe(true);
        const holder = doc.getElementById('gg-nsl-parking')!;
        expect(holder.parentElement).toBe(doc.body);
        expect(holder.hidden).toBe(true);
        expect([...holder.children].map((c) => c.id)).toEqual(Object.values(NSL_IDS));
        expect(doc.getElementById(NSL_IDS.music)).toBe(music); // the same element: NSL’s listeners stay on it
        expect([...doc.querySelector('.gh-actions')!.children].map((c) => c.className)).toEqual(['pad', 'gear']);
    });
    it('does nothing when they are already parked, or when NSL has none', () => {
        const doc = page();
        parkNsl(doc);
        expect(parkNsl(doc)).toBe(false);
        expect(doc.querySelectorAll('#gg-nsl-parking')).toHaveLength(1);
        expect(parkNsl(parseHTML('<html><body></body></html>').document)).toBe(false);
    });
});
