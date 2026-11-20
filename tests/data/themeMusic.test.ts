import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { NSL_IDS, nslPresent, pressNsl, readThemeMusic, themeMusicRows, type ThemeMusicState } from '../../src/data/themeMusic';

const KEY = 'The Witcher 3 Theme Music';

describe('readThemeMusic (NonSteamLaunchers’ ThemeMusicData)', () => {
    it('no data yet: music on, this game not muted (NSL’s own defaults)', () => {
        expect(readThemeMusic(null, KEY, true)).toEqual({ masterOn: true, gameMuted: false, playing: true, game: KEY });
    });
    it('master off, as a boolean or the string NSL sometimes writes', () => {
        expect(readThemeMusic(JSON.stringify({ themeMusic: false }), KEY, false).masterOn).toBe(false);
        expect(readThemeMusic(JSON.stringify({ themeMusic: 'false' }), KEY, false).masterOn).toBe(false);
        expect(readThemeMusic(JSON.stringify({ themeMusic: 'true' }), KEY, false).masterOn).toBe(true);
    });
    it('this game muted; another game’s mute does not count', () => {
        const raw = JSON.stringify({ [KEY]: { muted: true }, 'Other Theme Music': { muted: false } });
        expect(readThemeMusic(raw, KEY, false).gameMuted).toBe(true);
        expect(readThemeMusic(raw, 'Other Theme Music', false).gameMuted).toBe(false);
    });
    it('falls back to NSL’s currentlyPlaying name when the page key is missing', () => {
        const raw = JSON.stringify({ currentlyPlaying: { name: KEY }, [KEY]: { muted: 'true' } });
        expect(readThemeMusic(raw, null, false)).toMatchObject({ gameMuted: true, game: KEY });
    });
    it('broken JSON reads as no data', () => {
        expect(readThemeMusic('{oops', KEY, false)).toEqual({ masterOn: true, gameMuted: false, playing: false, game: KEY });
    });
});

function nslDoc() {
    const { document } = parseHTML(`<div>${Object.values(NSL_IDS).map((id) => `<div id="${id}" role="button"></div>`).join('')}</div>`);
    const log: string[] = [];
    for (const id of Object.values(NSL_IDS)) {
        const el = document.getElementById(id)!;
        for (const type of ['click', 'vgp_onbuttondown', 'vgp_onbuttonup']) {
            el.addEventListener(type, (e: Event) => {
                const detail = (e as CustomEvent).detail;
                const extra = type === 'click' ? `:${(e as MouseEvent).detail ?? 0}` : `:${detail?.button}`;
                log.push(`${id}:${type}${extra}`);
            });
        }
    }
    return { document, log };
}

describe('pressNsl (the events NSL’s own buttons answer)', () => {
    it('finds NSL’s buttons only when its master button is there', () => {
        expect(nslPresent(nslDoc().document)).toBe(true);
        expect(nslPresent(parseHTML('<div></div>').document)).toBe(false);
    });
    it('next and previous are plain clicks', async () => {
        const { document, log } = nslDoc();
        await pressNsl(document, 'next', true);
        await pressNsl(document, 'previous', true);
        expect(log).toEqual([`${NSL_IDS.right}:click:0`, `${NSL_IDS.left}:click:0`]);
    });
    it('music on/off is A pressed on the master button', async () => {
        const { document, log } = nslDoc();
        await pressNsl(document, 'master', true);
        expect(log).toEqual([`${NSL_IDS.mute}:vgp_onbuttondown:1`]);
    });
    it('mute this game: a short A press with the controller, a real click with the mouse fallback', async () => {
        const pad = nslDoc();
        await pressNsl(pad.document, 'gameMute', true);
        expect(pad.log).toEqual([`${NSL_IDS.music}:vgp_onbuttondown:1`, `${NSL_IDS.music}:vgp_onbuttonup:1`]);
        const mouse = nslDoc();
        await pressNsl(mouse.document, 'gameMute', false);
        expect(mouse.log).toEqual([`${NSL_IDS.music}:click:1`]);
    });
    it('keep this song: A held past NSL’s 450 ms hold, then released', async () => {
        const { document, log } = nslDoc();
        await pressNsl(document, 'keep', true, (ms) => { log.push(`wait:${ms}`); return Promise.resolve(); });
        expect(log).toEqual([`${NSL_IDS.music}:vgp_onbuttondown:1`, 'wait:600', `${NSL_IDS.music}:vgp_onbuttonup:1`]);
    });
    it('reports false when the button is gone', async () => {
        expect(await pressNsl(parseHTML('<div></div>').document, 'next', true)).toBe(false);
    });
});

describe('themeMusicRows (the menu: same rows, same places, state shown)', () => {
    const on: ThemeMusicState = { masterOn: true, gameMuted: false, playing: true, game: KEY };
    const menu = { skipped: false, kept: false, canKeep: true };
    const view = (state: ThemeMusicState, m = menu) => themeMusicRows(state, m).map((r) => `${r.action}${r.value ? `=${r.value}` : ''}${r.disabled ? ' (off)' : ''}`);

    it('always the same five rows in the same order', () => {
        const order = (state: ThemeMusicState) => themeMusicRows(state, menu).map((r) => r.action);
        const expected = ['next', 'previous', 'keep', 'gameMute', 'master'];
        expect(order(on)).toEqual(expected);
        expect(order({ ...on, gameMuted: true })).toEqual(expected);
        expect(order({ ...on, masterOn: false })).toEqual(expected);
    });
    it('music playing: skips work, keep waits for a skip, both switches On', () => {
        expect(view(on)).toEqual(['next', 'previous', 'keep (off)', 'gameMute=On', 'master=On']);
    });
    it('after a skip keep works; after keeping it says so until the next skip', () => {
        expect(view(on, { ...menu, skipped: true })).toEqual(['next', 'previous', 'keep', 'gameMute=On', 'master=On']);
        const kept = themeMusicRows(on, { ...menu, kept: true }).find((r) => r.action === 'keep');
        expect(kept).toMatchObject({ label: 'Song kept', disabled: true });
        expect(view(on, { ...menu, skipped: true, canKeep: false })[2]).toBe('keep (off)');
    });
    it('this game muted: its switch Off, skips and keep greyed out', () => {
        expect(view({ ...on, gameMuted: true }, { ...menu, skipped: true })).toEqual(['next (off)', 'previous (off)', 'keep (off)', 'gameMute=Off', 'master=On']);
    });
    it('all theme music off: only its own switch works', () => {
        expect(view({ ...on, masterOn: false })).toEqual(['next (off)', 'previous (off)', 'keep (off)', 'gameMute=On (off)', 'master=Off']);
    });
    it('labels', () => {
        expect(themeMusicRows(on, menu).map((r) => r.label)).toEqual(['Next song', 'Previous song', 'Keep this song', 'Music for this game', 'All theme music']);
    });
});
