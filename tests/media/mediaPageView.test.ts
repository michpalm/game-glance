import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', Navigation: {}, showContextMenu: () => {}, showModal: () => {}, ConfirmModal: 'div', Menu: 'div', MenuItem: 'div' }));
vi.mock('../../src/home/navSound', () => ({ playNavSound: vi.fn() }));
import { CoverImg, LibraryLogo } from '../../src/library/LibraryPage';
import { PageFrame } from '../../src/pageKit/PageKit';
import { GALLERY, MediaPageView, type MediaViewProps } from '../../src/media/MediaPage';
import { buildItems, dayGroups, mediaTabs, type RawClip, type RawShot } from '../../src/media/mediaModel';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    if (element.type === LibraryLogo) return [element];
    if (element.type === CoverImg) return [element, ...tree(element.props.fallback)];
    if (typeof element.type === 'function') return [element, ...tree((element.type as (p: unknown) => ReactNode)(element.props))];
    return [element, ...tree(element.props.children)];
}
const text = (node: ReactNode) => tree(node).flatMap(e => [e.props.children].flat().filter(c => typeof c === 'string' || typeof c === 'number')).join('|');
const byFocus = (node: ReactNode, key: string) => tree(node).find(e => e.props['data-gg-focus'] === key)!;

const local = (s: string) => Math.floor(new Date(s).getTime() / 1000);
const now = new Date('2026-11-19T12:00:00');
const shot = (h: number, t: string, extra: Partial<RawShot> = {}): RawShot => ({ nAppID: 7, strGameID: '7', hHandle: h, nWidth: 2560, nHeight: 1440, nCreated: local(t), strUrl: `s/${h}.jpg`, bUploaded: false, ePrivacy: 2, ...extra });
const clip: RawClip = { clip_id: 'abc', game_id: '1145360', date_recorded: local('2026-11-19T10:00:00'), duration_ms: 42000 };
const items = buildItems([shot(1, '2026-11-19T11:00:00'), shot(2, '2026-11-18T20:00:00', { bUploaded: true }), shot(3, '2026-11-18T19:00:00'), shot(4, '2026-11-18T18:00:00'), shot(5, '2026-11-18T17:00:00'), shot(6, '2026-11-18T16:00:00')], [clip]);

const props = (extra: Partial<MediaViewProps> = {}): MediaViewProps => ({
    screen: { kind: 'gallery' }, tab: 'all', tabs: mediaTabs(items), groups: dayGroups(items, now), items, now,
    focusId: '7_1', name: i => (i.appId === 7 ? 'Steam' : null), clipArt: id => [`header-${id}.jpg`], message: null, stripVisible: true,
    onTab: () => {}, onFocus: () => {}, onOpen: () => {}, onFull: () => {}, onStep: () => {}, onUpload: () => {}, onDelete: () => {},
    onSteamMedia: () => {}, onBack: () => {}, onPress: () => {}, ...extra,
});

describe('gallery', () => {
    it('day eyebrows in order', () => {
        const t = text(MediaPageView(props()));
        expect(t).toContain('Media');
        expect(t.indexOf('Today')).toBeGreaterThan(-1);
        expect(t.indexOf('Yesterday')).toBeGreaterThan(t.indexOf('Today'));
    });
    it("a shot tile's buttons", () => {
        const onOpen = vi.fn(), onUpload = vi.fn(), onDelete = vi.fn(), onSteamMedia = vi.fn();
        const tile = byFocus(MediaPageView(props({ onOpen, onUpload, onDelete, onSteamMedia })), 'media:7_1');
        expect(tile.props.className).toBe('gg-media-tile');
        expect(tile.props.onOKActionDescription).toBe('View');
        expect(tile.props.onSecondaryActionDescription).toBe('Upload to Steam');
        expect(tile.props.onOptionsActionDescription).toBe('Delete');
        expect(tile.props.onMenuActionDescription).toBe("Steam's media");
        tile.props.onClick(); tile.props.onSecondaryButton(); tile.props.onOptionsButton(); tile.props.onMenuButton();
        expect(onOpen).toHaveBeenCalledWith(items[0]);
        expect(onUpload).toHaveBeenCalledWith(items[0]);
        expect(onDelete).toHaveBeenCalledWith(items[0]);
        expect(onSteamMedia).toHaveBeenCalled();
    });
    it('an uploaded shot has no X', () => {
        const tile = byFocus(MediaPageView(props()), 'media:7_2');
        expect(tile.props.onSecondaryButton).toBeUndefined();
    });
    it('a clip tile shows its length and plays', () => {
        const tile = byFocus(MediaPageView(props()), 'media:clip_abc');
        expect(text(tile)).toContain('0:42');
        expect(tile.props.onOKActionDescription).toBe('Play');
        expect(tile.props.onSecondaryButton).toBeUndefined();
    });
    it('empty (Review Focus 1)', () => {
        const out = MediaPageView(props({ items: [], groups: [], tabs: mediaTabs([]), focusId: null }));
        expect(text(out)).toContain('Nothing captured yet');
        expect(tree(out).some(e => e.props.className === 'gg-media-tile')).toBe(false);
    });
    it('tiles are 5 a row of 330 × 186', () => {
        expect(GALLERY).toEqual({ cols: 5, tileW: 330, tileH: 186, gap: 20 });
        const rows = tree(MediaPageView(props())).filter(e => e.props.className === 'gg-media-row');
        expect(rows.map(r => [r.props.children].flat().length)).toEqual([2, 5]);
    });
});

describe('viewer', () => {
    const viewer = (extra: Partial<MediaViewProps> = {}) => MediaPageView(props({ screen: { kind: 'viewer', id: '7_3' }, focusId: '7_3', ...extra }));
    it('Full screen first and focused', () => {
        const onFull = vi.fn();
        const actions = tree(viewer({ onFull })).filter(e => e.props.className === 'gg-media-action');
        expect(text(actions[0])).toContain('Full screen');
        expect(actions[0].props.preferredFocus).toBe(true);
        actions[0].props.onClick();
        expect(onFull).toHaveBeenCalledWith(items.find(i => i.id === '7_3'));
        // No button badges on the rows: they are pressed with A; X/Y/≡ are the footer's shortcuts (Michael, PS5 check 2).
        expect(actions.map(a => text(a))).toEqual(['Full screen', 'Upload to Steam', 'Delete']);
        expect(tree(viewer()).some(e => e.props.className === 'gg-media-glyph')).toBe(false);
    });
    it('details and Uploaded hides Upload', () => {
        expect(text(viewer())).toContain('Screenshot · 2560 × 1440');
        expect(text(viewer())).toContain('18 November, 19:00');
        const up = viewer({ screen: { kind: 'viewer', id: '7_2' } });
        expect(text(up)).toContain('Uploaded');
        expect(text(up)).not.toContain('Upload to Steam');
    });
    it('the name once: the logo slot shows it when there is no logo', () => {
        const out = tree(viewer());
        expect(out.find(e => e.type === LibraryLogo)!.props.name).toBe('Steam');
        expect(out.some(e => e.props.className === 'gg-media-panel-name')).toBe(false);
    });
    it("≡ is the viewer's Full screen shortcut; Steam's media is the gallery's only (Michael, PS5 check 4)", () => {
        const onFull = vi.fn(), onSteamMedia = vi.fn();
        const actions = tree(viewer({ onFull, onSteamMedia })).filter(e => e.props.className === 'gg-media-action');
        for (const a of actions) expect(a.props.onMenuActionDescription).toBe('Full screen');
        actions[2].props.onMenuButton();
        expect(onFull).toHaveBeenCalledWith(items.find(i => i.id === '7_3'));
        expect(onSteamMedia).not.toHaveBeenCalled();
        const full = tree(MediaPageView(props({ screen: { kind: 'full', id: '7_2' } }))).find(e => e.props.className === 'gg-media-full-shot')!;
        expect(full.props.onMenuButton).toBeUndefined();
        expect(byFocus(MediaPageView(props()), 'media:7_1').props.onMenuActionDescription).toBe("Steam's media");
    });
    it('D-pad left/right step too (Michael, PS5 check 3: up/down move through the actions)', () => {
        const onStep = vi.fn();
        const root = tree(viewer({ onStep })).find(e => e.type === PageFrame)!;
        root.props.onButtonDown({ detail: { button: 12 } });
        root.props.onButtonDown({ detail: { button: 11 } });
        root.props.onButtonDown({ detail: { button: 9 } });
        expect(onStep.mock.calls).toEqual([[1], [-1]]);
    });
    it('filmstrip: at most 7, the current ringed', () => {
        const strip = tree(viewer()).filter(e => String(e.props.className).startsWith('gg-media-film'));
        expect(strip.length).toBeLessThanOrEqual(7);
        expect(strip.filter(e => e.props.className === 'gg-media-film gg-media-film-current')).toHaveLength(1);
    });
    it('L1/R1 step', () => {
        const onStep = vi.fn();
        const root = tree(viewer({ onStep })).find(e => e.type === PageFrame)!;
        root.props.onButtonDown({ detail: { button: 6 } });
        root.props.onButtonDown({ detail: { button: 5 } });
        expect(onStep.mock.calls).toEqual([[1], [-1]]);
    });
});

describe('full screen', () => {
    const full = (extra: Partial<MediaViewProps> = {}) => MediaPageView(props({ screen: { kind: 'full', id: '7_2' }, focusId: '7_2', ...extra }));
    it('strip "2 of 6" (screenshots only) and its visibility', () => {
        const strip = tree(full()).find(e => e.props.className === 'gg-media-strip')!;
        expect(text(strip)).toContain('2 of 6');
        expect(strip.props['data-visible']).toBe(true);
        expect(tree(full({ stripVisible: false })).find(e => e.props.className === 'gg-media-strip')!.props['data-visible']).toBe(false);
    });
    it('L1/R1 step; any press is reported', () => {
        const onStep = vi.fn(), onPress = vi.fn();
        const root = tree(full({ onStep, onPress })).find(e => e.type === PageFrame)!;
        root.props.onButtonDown({ detail: { button: 6 } });
        root.props.onButtonDown({ detail: { button: 5 } });
        root.props.onButtonDown({ detail: { button: 12 } });
        root.props.onButtonDown({ detail: { button: 1 } });
        expect(onStep.mock.calls).toEqual([[1], [-1], [1]]);
        expect(onPress).toHaveBeenCalledTimes(4);
    });
    it('a message shows as a toast', () => {
        expect(text(full({ message: "Couldn't delete" }))).toContain("Couldn't delete");
    });
});
