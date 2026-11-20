import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ DialogButton: 'button', Focusable: 'div', ConfirmModal: 'div', Navigation: {}, showModal: () => {} }));
import { DownloadsPageView, FallbackImg } from '../../src/downloads/DownloadsPage';
import { graphPath, graphScale, type DownloadsView } from '../../src/downloads/downloadsModel';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    if (element.type === FallbackImg) return [element, ...tree(element.props.fallback)];
    if (typeof element.type === 'function') return tree((element.type as (p: unknown) => ReactNode)(element.props));
    return [element, ...tree(element.props.children)];
}
const text = (node: ReactNode): string => tree(node).flatMap(e => [e.props.children].flat().filter(c => typeof c === 'string' || typeof c === 'number')).join(' ');
const focus = (node: ReactNode, key: string) => tree(node).find(e => e.props['data-gg-focus'] === key);

const view = (extra: Partial<DownloadsView> = {}): DownloadsView => ({
    current: { mode: 'active', appId: 10, name: 'Observer: System Redux', percent: 74, line: '7.1 of 9.5 GB · about 2 min left', download: .75, install: .74, action: 'pause' },
    network: { mbps: '248', peak: 'Peak 248', disk: 'Disk 261', samples: [1, 3, 2], diskSamples: [2, 4, 1], peakBytes: 3 },
    queue: [{ appId: 20, name: 'Still Wakes the Deep', line: '120 MB of 12.0 GB', percent: 1, ratio: .01, tag: 'NEXT', queueIndex: 1, canMoveUp: false },
        { appId: 30, name: 'ROUTINE', line: '152 MB of 9.7 GB', percent: 2, ratio: .02, tag: 'PAUSED', queueIndex: 2, canMoveUp: true }],
    completed: [{ appId: 40, name: 'Batman', line: '7.6 GB · finished 12 min ago' }],
    ...extra,
});
const render = (v: DownloadsView, extra: Record<string, unknown> = {}) => DownloadsPageView({ view: v, art: () => null, hero: id => [`hero-${id}.jpg`], logo: id => [`logo-${id}.png`], onCurrent: () => {}, onQueue: () => {},
    onCompleted: () => {}, onBack: () => {}, onOptions: () => {}, ...extra });

describe('DownloadsPageView', () => {
    it('draws the title, the current download\'s figures and both bars', () => {
        const out = render(view());
        const all = text(out);
        for (const s of ['Downloads', 'Observer: System Redux', '74', '% installed', '7.1 of 9.5 GB · about 2 min left', 'DOWNLOAD', 'INSTALL']) expect(all).toContain(s);
        const widths = tree(focus(out, 'downloads:current')).filter(e => e.props.className === 'gg-dl-bar-fill').map(e => e.props.style.width);
        expect(widths).toEqual(['75%', '74%']);
        expect(focus(out, 'downloads:current')?.props.onOKActionDescription).toBe('Pause');
    });
    it('a paused card says Paused and A resumes', () => {
        const out = render(view({ current: { ...view().current, mode: 'paused', action: 'resume' } }));
        expect(text(out)).toContain('Paused');
        expect(focus(out, 'downloads:current')?.props.onOKActionDescription).toBe('Resume');
    });
    it('the idle card says Nothing downloading and takes no focus', () => {
        const out = render(view({ current: { mode: 'idle', appId: null, name: 'Nothing downloading', percent: 0, line: '', download: 0, install: 0, action: null }, queue: [] }));
        expect(text(out)).toContain('Nothing downloading');
        expect(focus(out, 'downloads:current')).toBeUndefined();
        expect(text(out)).not.toContain('UP NEXT');
    });
    it('draws the network figures and Steam\'s speed graph', () => {
        const out = render(view());
        for (const s of ['Network', '248', 'Mbps', 'Peak 248', 'Disk 261']) expect(text(out)).toContain(s);
        const v = view(), top = graphScale(v.network);
        const byClass = (c: string) => tree(out).find(e => e.props.className === c);
        expect(byClass('gg-dl-graph-area')?.props.d).toBe(graphPath([1, 3, 2], 468, 122, top).area);
        expect(byClass('gg-dl-graph-line')?.props.d).toBe(graphPath([1, 3, 2], 468, 122, top).line);
        expect(byClass('gg-dl-graph-disk')?.props.d).toBe(graphPath([2, 4, 1], 468, 122, top).line);
        const peak = byClass('gg-dl-graph-peak')!.props;
        expect([peak.y1, peak.y2]).toEqual([122 - 3 / top * 122, 122 - 3 / top * 122]);
        expect(byClass('gg-dl-key gg-dl-key-peak')).toBeDefined();
        expect(byClass('gg-dl-key gg-dl-key-disk')).toBeDefined();
    });
    it('no peak yet: no Peak line', () => {
        const out = render(view({ network: { ...view().network, peakBytes: 0 } }));
        expect(tree(out).find(e => e.props.className === 'gg-dl-graph-peak')).toBeUndefined();
    });
    it('the card: Steam\'s hero art edge to edge, the game\'s logo on it, the name when the logo cannot load (mock-up B)', () => {
        const out = render(view());
        const imgs = tree(focus(out, 'downloads:current')).filter(e => e.type === FallbackImg);
        const hero = imgs.find(e => e.props.className === 'gg-dl-card-hero-img')!.props, logo = imgs.find(e => e.props.className === 'gg-dl-card-logo')!.props;
        expect(hero.urls).toEqual(['hero-10.jpg']);
        expect(logo.urls).toEqual(['logo-10.png']);
        expect(logo.alt).toBe('Observer: System Redux');
        expect(text(logo.fallback)).toContain('Observer: System Redux');
    });
    it('the page backdrop, as Storage: the current game\'s hero, else the newest completed one\'s, else none', () => {
        const bg = (out: ReactNode) => tree(out).find(e => e.props.className === 'gg-dl-hero')?.props.style;
        expect(bg(render(view()))).toEqual({ backgroundImage: 'url("hero-10.jpg")' });
        const idle = { mode: 'idle' as const, appId: null, name: 'Nothing downloading', percent: 0, line: '', download: 0, install: 0, action: null };
        expect(bg(render(view({ current: idle })))).toEqual({ backgroundImage: 'url("hero-40.jpg")' });
        expect(bg(render(view({ current: idle, completed: [] })))).toBeUndefined();
        expect(tree(render(view())).some(e => e.props.className === 'gg-dl-shade')).toBe(true);
    });
    it('a game without hero art keeps its name as text, no art block', () => {
        const out = DownloadsPageView({ view: view(), art: () => null, hero: () => [], logo: () => [], onCurrent: () => {}, onQueue: () => {}, onCompleted: () => {}, onBack: () => {}, onOptions: () => {} });
        expect(tree(out).some(e => e.type === FallbackImg)).toBe(false);
        expect(text(out)).toContain('Observer: System Redux');
    });
    it('queue rows: Download now, Move up only when it can, Remove; tags and the header count', () => {
        const onQueue = vi.fn();
        const out = render(view(), { onQueue });
        expect(text(out)).toContain('UP NEXT · 2');
        const first = focus(out, 'downloads:queue:20')!.props, second = focus(out, 'downloads:queue:30')!.props;
        expect(first).toMatchObject({ onOKActionDescription: 'Download now', onOptionsActionDescription: 'Remove' });
        expect(first.onSecondaryButton).toBeUndefined();
        expect(second.onSecondaryActionDescription).toBe('Move up');
        expect(text(out)).toContain('NEXT');
        expect(text(out)).toContain('PAUSED');
        second.onSecondaryButton(); second.onOptionsButton(); first.onClick();
        expect(onQueue.mock.calls.map(c => [c[0].appId, c[1]])).toEqual([[30, 'x'], [30, 'y'], [20, 'a']]);
    });
    it('completed rows: Game page and Remove, under COMPLETED; no header without rows', () => {
        const onCompleted = vi.fn();
        const out = render(view(), { onCompleted });
        expect(text(out)).toContain('COMPLETED');
        expect(text(out)).toContain('7.6 GB · finished 12 min ago');
        const row = focus(out, 'downloads:done:40')!.props;
        expect(row).toMatchObject({ onOKActionDescription: 'Game page', onOptionsActionDescription: 'Remove' });
        row.onOptionsButton();
        expect(onCompleted).toHaveBeenCalledWith(expect.objectContaining({ appId: 40 }), 'y');
        expect(text(render(view({ completed: [] })))).not.toContain('COMPLETED');
    });
    it('Start is Options, B goes back', () => {
        const onOptions = vi.fn(), onBack = vi.fn();
        const root = render(view(), { onOptions, onBack }) as ReactElement<Record<string, any>>;
        expect(root.props.onMenuActionDescription).toBe('Options');
        root.props.onMenuButton();
        expect(onOptions).toHaveBeenCalled();
        expect(root.props.onCancelButton).toBe(onBack);
    });
});
