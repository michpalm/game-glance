import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { formatSession, readInGame } from '../../src/menu/inGame';
import { InGameContents } from '../../src/menu/components/InGamePanel';
import type { GameContext } from '../../src/menu/model';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', NavEntryPositionPreferences: { MAINTAIN_X: 1 } }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const text = (nodes: ReactElement<Record<string, any>>[]) => nodes.map(n => typeof n.props.children === 'string' ? n.props.children : Array.isArray(n.props.children) ? n.props.children.filter((c: unknown) => typeof c === 'string').join('') : '').join(' ');
const ori: GameContext = { appId: 1057090, gameId: '1057090', name: 'Ori and the Will of the Wisps', kind: 'local', actionIds: [] };
const now = 1_793_140_217;

describe('in-game page data', () => {
    it('counts this session from Steam’s local launch time, not its last-played time', () => {
        const stats = readInGame(1057090, { overview: () => ({ rt_last_time_played: now - 3 * 3600, rt_last_time_locally_played: now - 33 * 60 }), achievements: () => ({ unlocked: 10, total: 37 }) }, now);
        expect(stats.sessionMinutes).toBe(33);
        expect(stats.achievements).toEqual({ unlocked: 10, total: 37 });
    });
    it('shows nothing it cannot trust', () => {
        const bad = (start: number | undefined, achievements: unknown) => readInGame(1, { overview: () => ({ rt_last_time_locally_played: start }), achievements: () => achievements as never }, now);
        expect(bad(undefined, undefined)).toEqual({ sessionMinutes: null, achievements: null });
        expect(bad(now + 600, { unlocked: 5, total: 0 }).sessionMinutes).toBeNull();
        expect(bad(now - 8 * 86400, { unlocked: 9, total: 3 })).toEqual({ sessionMinutes: null, achievements: null });
        expect(readInGame(1, { overview: () => { throw Error('not loaded'); }, achievements: () => { throw Error('no cache'); } }, now)).toEqual({ sessionMinutes: null, achievements: null });
    });
    it('formats the session length the way the page says it', () => {
        expect(formatSession(0)).toBe('Under a minute this session');
        expect(formatSession(33)).toBe('33 min this session');
        expect(formatSession(65)).toBe('1 h 05 min this session');
    });
});

describe('in-game page', () => {
    function harness(change: Partial<Parameters<typeof InGameContents>[0]> = {}) {
        const handoff = vi.fn(), armExit = vi.fn();
        const element = InGameContents({ game: ori, stats: { sessionMinutes: 33, achievements: { unlocked: 10, total: 37 } }, hero: 'hero.jpg', logo: 'logo.png', exitArmed: false, armExit, handoff, ...change });
        const nodes = tree(element);
        return { nodes, handoff, armExit, action: (key: string) => nodes.find(n => n.props.id === key)! };
    }
    it('leads with the game’s art and this session, and offers its six destinations as tiles', () => {
        const h = harness();
        expect(h.nodes.some(n => n.type === 'img' && n.props.src === 'hero.jpg')).toBe(true);
        expect(h.nodes.some(n => n.type === 'img' && n.props.src === 'logo.png' && n.props.alt === 'Ori and the Will of the Wisps')).toBe(true);
        expect(text(h.nodes)).toContain('33 min this session');
        expect(text(h.nodes)).not.toMatch(/last played/i);
        expect(['achievements', 'recordings', 'guides', 'controller', 'game-page', 'exit'].map(a => !!h.action(`in-game:${a}`))).toEqual([true, true, true, true, true, true]);
    });
    it('puts achievement progress in its tile as a bar', () => {
        const h = harness();
        expect(text(h.nodes)).toContain('10 of 37');
        expect(h.nodes.find(n => n.props.className === 'gg-ingame-progress')?.props.style).toEqual({ width: '27%' });
        expect(text(harness({ stats: { sessionMinutes: null, achievements: null } }).nodes)).not.toContain('of');
    });
    it('opens each destination for the running game', () => {
        const h = harness();
        h.action('in-game:guides').props.onAction();
        expect(h.handoff).toHaveBeenCalledWith({ kind: 'game-action', appId: 1057090, gameId: '1057090', actionId: 'guides' });
    });
    it('asks once before exiting the game', () => {
        const first = harness();
        first.action('in-game:exit').props.onAction();
        expect(first.armExit).toHaveBeenCalled(); expect(first.handoff).not.toHaveBeenCalled();
        const armed = harness({ exitArmed: true });
        expect(text(armed.nodes)).toContain('Press again to exit');
        armed.action('in-game:exit').props.onAction();
        expect(armed.handoff).toHaveBeenCalledWith({ kind: 'game-action', appId: 1057090, gameId: '1057090', actionId: 'exit' });
    });
    it('shows the game’s name only once it is known there is no logo, and nothing while it is being resolved', () => {
        expect(text(harness({ logo: null }).nodes)).toContain('Ori and the Will of the Wisps');
        const resolving = harness({ logo: undefined, hero: null });
        expect(text(resolving.nodes)).not.toContain('Ori and the Will of the Wisps');
        expect(resolving.nodes.some(n => n.type === 'img')).toBe(false);
    });
});
