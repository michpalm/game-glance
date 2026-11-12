import { type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@decky/ui', () => ({ Focusable: 'div' }));
import { parseHTML } from 'linkedom';
import { MenuPickerView, pickerFocusTarget, type PickerOption } from '../../src/menu/components/MenuPicker';
import { menuStyles as styles } from '../../src/menu/styles';

function tree(node: ReactNode): ReactElement<Record<string, any>>[] {
    if (Array.isArray(node)) return node.flatMap(tree);
    if (!node || typeof node !== 'object' || !('props' in node)) return [];
    const element = node as ReactElement<Record<string, any>>;
    return [element, ...tree(element.props.children)];
}
const text = (node: ReactNode): string => tree(node).map((n) => [n.props.children].flat().filter((c) => typeof c === 'string').join('')).join('');
const OPTIONS: PickerOption<number>[] = [{ id: 1, label: 'Online', dot: '#57cbde' }, { id: 7, label: 'Invisible', sub: 'Appear offline, still chat', dot: 'ring' }];
function view(over: Partial<Parameters<typeof MenuPickerView<number>>[0]> = {}) {
    const props = { id: 'social:status', label: undefined, text: 'Invisible', dot: 'ring', options: OPTIONS, selected: 7 as number | null, open: false, onOpen: vi.fn(), onPick: vi.fn(), onClose: vi.fn(), ...over };
    return { props, nodes: tree(MenuPickerView<number>(props)) };
}

describe('MenuPickerView', () => {
    it('closed: one pill with its id, label, text and dot, and no list', () => {
        const { nodes, props } = view({ label: 'Output' });
        const pill = nodes.find((n) => n.props.id === 'social:status')!;
        expect(pill.props.className).toContain('gg-menu-picker');
        pill.props.onActivate(); expect(props.onOpen).toHaveBeenCalled();
        expect(text(pill)).toContain('Output'); expect(text(pill)).toContain('Invisible');
        expect(nodes.some((n) => n.props.dot === 'ring')).toBe(true); // the Dot element (rendered as data-dot="ring")
        expect(nodes.some((n) => String(n.props.className).includes('gg-menu-picker-list'))).toBe(false);
    });
    it('open: one entry per option in order, the selected one marked; picking and cancelling', () => {
        const { nodes, props } = view({ open: true });
        const entries = nodes.filter((n) => n.props.className === 'gg-menu-picker-option');
        expect(entries.map((e) => text(e))).toEqual(['Online', 'InvisibleAppear offline, still chat']);
        expect(entries.map((e) => e.props['data-selected'] ?? null)).toEqual([null, '']);
        entries[0].props.onActivate(); expect(props.onPick).toHaveBeenCalledWith(1);
        entries[1].props.onCancel(); expect(props.onClose).toHaveBeenCalled();
    });
    it('ticks nothing when nothing is selected', () => {
        const { nodes } = view({ open: true, selected: null });
        expect(nodes.some((n) => n.props['data-selected'] !== undefined)).toBe(false);
    });
    it('styles: the pill text truncates, list entries wrap', () => {
        expect(styles).toMatch(/\.gg-menu-picker-text\{[^}]*text-overflow:ellipsis/);
        expect(styles).toMatch(/\.gg-menu-picker-option\{[^}]*white-space:normal/);
    });
});

describe('MenuPicker focus and B', () => {
    it('B on the list or an entry closes only the list: the event never reaches the menu (which would go back)', () => {
        const { nodes, props } = view({ open: true });
        const list = nodes.find((n) => n.props.className === 'gg-menu-picker-list')!;
        const entry = nodes.find((n) => n.props.className === 'gg-menu-picker-option')!;
        for (const target of [list, entry]) {
            const event = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
            target.props.onCancel(event);
            expect(event.stopPropagation).toHaveBeenCalled();
            expect(event.preventDefault).toHaveBeenCalled();
        }
        expect(props.onClose).toHaveBeenCalledTimes(2);
    });
    it('opening puts focus on the ticked entry, or the first', () => {
        const { document } = parseHTML('<div class="gg-menu-picker-list"><div class="gg-menu-picker-option" id="a"></div><div class="gg-menu-picker-option" id="b" data-selected=""></div></div>');
        const list = document.querySelector('.gg-menu-picker-list') as unknown as Element;
        expect(pickerFocusTarget(list)?.id).toBe('b');
        document.querySelector('#b')!.removeAttribute('data-selected');
        expect(pickerFocusTarget(list)?.id).toBe('a');
        expect(pickerFocusTarget(null)).toBeNull();
    });
    it('the pill sits right after the heading, the count keeps the right edge', () => {
        expect(styles).toMatch(/\.gg-menu-heading>\.gg-menu-picker-anchor\{margin-right:auto\}/);
    });
});
