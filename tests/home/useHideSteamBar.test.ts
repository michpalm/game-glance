import { describe, expect, it } from 'vitest';
import { coverBar, COVERED, handBarBack, holdCover } from '../../src/home/useHideSteamBar';

describe('holdCover', () => {
    it("the first to let go does not uncover Steam's bar while the other still holds it (Home unmounting after the open)", () => {
        const doc = {};
        const home = holdCover(doc);
        const page = holdCover(doc);
        expect(home()).toBe(false);
        expect(page()).toBe(true);
    });
    it('one document does not hold another, and letting go twice counts once', () => {
        const a = {};
        const b = {};
        const releaseA = holdCover(a);
        const releaseB = holdCover(b);
        expect(releaseB()).toBe(true);
        const again = holdCover(a);
        expect(releaseA()).toBe(false);
        expect(releaseA()).toBe(false);
        expect(again()).toBe(true);
    });
});

function fakeDoc() {
    const els: any[] = [];
    const doc: any = { querySelectorAll: (sel: string) => (sel === `[${COVERED}]` ? els.filter((e) => e.covered) : []) };
    const bar = () => {
        const e: any = {
            covered: false,
            hasAttribute: (k: string) => k === COVERED && e.covered,
            setAttribute: (k: string) => { if (k === COVERED) e.covered = true; },
            removeAttribute: (k: string) => { if (k === COVERED) e.covered = false; },
        };
        els.push(e);
        return e;
    };
    return { doc, bar };
}

describe('handBarBack', () => {
    it('clears an existing cover', () => {
        const { doc, bar } = fakeDoc();
        const b = bar();
        coverBar(doc, b);
        expect(b.covered).toBe(true);
        handBarBack(doc);
        expect(b.covered).toBe(false);
    });
    it("a holder's later cover attempt leaves the bar uncovered, until a new holder mounts", () => {
        const { doc, bar } = fakeDoc();
        const b = bar();
        const home = holdCover(doc);
        coverBar(doc, b);
        handBarBack(doc);
        coverBar(doc, b);
        expect(b.covered).toBe(false);
        holdCover(doc);
        coverBar(doc, b);
        expect(b.covered).toBe(true);
        home();
    });
    it('does not touch another document', () => {
        const a = fakeDoc();
        const other = fakeDoc();
        const ob = other.bar();
        handBarBack(a.doc);
        coverBar(other.doc, ob);
        expect(ob.covered).toBe(true);
    });
});

describe('coverBar', () => {
    it('covers the bar once and uncovers another element', () => {
        const { doc, bar } = fakeDoc();
        const old = bar();
        const b = bar();
        coverBar(doc, old);
        coverBar(doc, b);
        expect(old.covered).toBe(false);
        expect(b.covered).toBe(true);
    });
});
