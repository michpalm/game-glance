import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { clock, SoundtrackPanel, type SoundtrackActions } from '../../src/menu/components/SoundtrackPanel';
import type { SoundtrackSnapshot } from '../../src/menu/steam/soundtrack';

vi.mock('@decky/ui', () => ({ Focusable: 'div', DialogButton: 'button', SliderField: 'slider-field', NavEntryPositionPreferences: {} }));
function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children), ...tree(element.props.label)];
}
const playing: SoundtrackSnapshot = { status: 'playing', appId: 1143852, album: 'Blasphemous - OST', track: 'Que las Campanas Me Doblen',
    cover: 'https://steamloopback.host/assets/1143852/85ed68cb95eede61246d15e29f036d8b3de8fd6a.jpg', lengthMs: 288317, positionMs: 125443, shuffle: false, repeat: 'off', volume: 12 };
const actions = () => ({ togglePlay: vi.fn(), previous: vi.fn(), next: vi.fn(), toggleShuffle: vi.fn(), cycleRepeat: vi.fn(), setVolume: vi.fn(), seek: vi.fn(), browse: vi.fn() }) satisfies SoundtrackActions;
const ids = (node: ReactNode) => tree(node).map(n => n.props.id).filter((id): id is string => typeof id === 'string');
const byId = (node: ReactNode, id: string) => tree(node).find(n => n.props.id === id)!;

it('formats track times as m:ss', () => {
    expect(clock(0)).toBe('0:00'); expect(clock(125443)).toBe('2:05'); expect(clock(288317)).toBe('4:48'); expect(clock(3600000)).toBe('60:00');
});

describe('playing', () => {
    it('shows the cover, album, track, position, the five controls, volume and Browse', () => {
        const page = SoundtrackPanel({ s: playing, a: actions() });
        expect(ids(page)).toEqual(['soundtrack:browse', 'soundtrack:shuffle', 'soundtrack:previous', 'soundtrack:play', 'soundtrack:next', 'soundtrack:repeat']);
        const nodes = tree(page);
        expect(nodes.find(n => n.type === 'img')!.props.src).toBe(playing.cover);
        expect(nodes.some(n => n.props.children === 'Blasphemous - OST')).toBe(true);
        expect(nodes.some(n => n.props.children === 'Que las Campanas Me Doblen')).toBe(true);
        const [position, volume] = nodes.filter(n => n.type === 'slider-field');
        expect(position.props).toMatchObject({ value: 125443, min: 0, max: 288317 });
        expect(volume.props).toMatchObject({ value: 12, min: 0, max: 100 });
    });
    it('sends each control, the seek and the volume', () => {
        const a = actions();
        const page = SoundtrackPanel({ s: playing, a });
        for (const [id, fn] of [['soundtrack:shuffle', a.toggleShuffle], ['soundtrack:previous', a.previous], ['soundtrack:play', a.togglePlay], ['soundtrack:next', a.next], ['soundtrack:repeat', a.cycleRepeat], ['soundtrack:browse', a.browse]] as const) {
            byId(page, id).props.onAction(); expect(fn).toHaveBeenCalledTimes(1);
        }
        const [position, volume] = tree(page).filter(n => n.type === 'slider-field');
        position.props.onChange(60000); expect(a.seek).toHaveBeenCalledWith(60000);
        volume.props.onChange(30); expect(a.setVolume).toHaveBeenCalledWith(30);
    });
    it('names play/pause for what it does and marks shuffle and repeat while on', () => {
        expect(byId(SoundtrackPanel({ s: playing, a: actions() }), 'soundtrack:play').props.ariaLabel).toBe('Pause');
        const paused = SoundtrackPanel({ s: { ...playing, status: 'paused', shuffle: true, repeat: 'one' }, a: actions() });
        expect(byId(paused, 'soundtrack:play').props.ariaLabel).toBe('Play');
        expect(byId(paused, 'soundtrack:shuffle').props.selected).toBe(true);
        expect(byId(paused, 'soundtrack:repeat').props.selected).toBe(true);
        expect(byId(paused, 'soundtrack:repeat').props.ariaLabel).toBe('Repeat one');
        expect(byId(SoundtrackPanel({ s: playing, a: actions() }), 'soundtrack:repeat').props.selected).toBe(false);
    });
    it('draws a music tile while the cover is not known yet', () => {
        const nodes = tree(SoundtrackPanel({ s: { ...playing, cover: null }, a: actions() }));
        expect(nodes.some(n => n.type === 'img')).toBe(false);
        expect(nodes.some(n => String(n.props.className).includes('gg-soundtrack-empty'))).toBe(true);
    });
});

it('shows the empty state with nothing playing, Browse kept', () => {
    const page = SoundtrackPanel({ s: { ...playing, status: 'idle' }, a: actions() });
    expect(ids(page)).toEqual(['soundtrack:browse']);
    const nodes = tree(page);
    expect(nodes.some(n => n.props.children === 'Nothing playing')).toBe(true);
    expect(nodes.some(n => n.props.children === 'Pick a soundtrack to start.')).toBe(true);
    expect(nodes.some(n => n.type === 'slider-field')).toBe(false);
});
