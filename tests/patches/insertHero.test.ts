import { describe, expect, it } from 'vitest';
import { insertHero } from '../../src/patches/insertHero';

const INNER = 'inner_abc';

function anchor() {
    return { props: { childFocusDisabled: false, navRef: {}, children: { props: { details: {}, overview: {}, bFastRender: true } } } };
}

function tree(children: unknown[]) {
    return { props: { children: { props: { className: `x ${INNER}`, children } } } };
}

const findInTree = (node: any, pred: (x: any) => boolean): any => {
    if (!node || typeof node !== 'object') return null;
    if (pred(node)) return node;
    for (const value of Object.values(node)) {
        const hit = findInTree(value, pred);
        if (hit) return hit;
    }
    return null;
};

describe('insertHero', () => {
    it('inserts the element right before Steam\'s overview block (Play row + tabs)', () => {
        const header = { key: 'header' };
        const overview = anchor();
        const root = tree([header, overview]);
        const hero = { key: 'game-glance' };
        expect(insertHero(root, INNER, hero, findInTree)).toBe('inserted');
        expect(root.props.children.props.children).toEqual([header, hero, overview]);
    });
    it('does not insert twice', () => {
        const root = tree([{ key: 'header' }, anchor()]);
        const hero = { key: 'game-glance' };
        insertHero(root, INNER, hero, findInTree);
        expect(insertHero(root, INNER, hero, findInTree)).toBe('present');
        expect(root.props.children.props.children).toHaveLength(3);
    });
    it('leaves the tree unchanged when the anchor is missing', () => {
        const root = tree([{ key: 'header' }, { key: 'other' }]);
        expect(insertHero(root, INNER, { key: 'game-glance' }, findInTree)).toBe('noAnchor');
        expect(root.props.children.props.children).toHaveLength(2);
    });
    it('never throws when the class name is unknown or the tree is odd', () => {
        const root = tree([anchor()]);
        expect(insertHero(root, undefined, { key: 'game-glance' }, findInTree)).toBe('noContainer');
        expect(insertHero(null, INNER, { key: 'game-glance' }, findInTree)).toBe('noContainer');
        const throwing = () => { throw new Error('boom'); };
        expect(insertHero(root, INNER, { key: 'game-glance' }, throwing)).toBe('error');
    });
});
