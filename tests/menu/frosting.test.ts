import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { frostMenuSurfaces } from '../../src/menu/frosting';

function fixture() {
    const owner = parseHTML('<html><body><section><div id="viewport"></div><div id="foreign"></div></section></body></html>');
    const source = parseHTML('<html><body><div class="gg-menu"><div class="gg-menu-bar"></div><div class="gg-menu-panel"></div><button class="gg-menu-notifications"></button></div><div id="outside"></div></body></html>');
    Object.defineProperty(source.window, 'innerWidth', { value: 1000, configurable: true });
    Object.defineProperty(source.window, 'innerHeight', { value: 600, configurable: true });
    const viewport = owner.document.querySelector('#viewport')!;
    viewport.getBoundingClientRect = () => ({ left: 20, top: 30, width: 800, height: 450 } as DOMRect);
    let left = 200;
    for (const e of source.document.querySelectorAll('.gg-menu-bar,.gg-menu-panel,.gg-menu-notifications')) {
        e.getBoundingClientRect = () => ({ left, top: 100, width: 600, height: 300 } as DOMRect);
        (e as HTMLElement).style.borderRadius = '24px';
    }
    return { owner, source, viewport, move: () => { left = 300; } };
}

describe('menu-only Steam-page frosting', () => {
    it('maps only owned menu surfaces into the native viewport, with no full-screen blur layer', () => {
        const f = fixture(), stop = frostMenuSurfaces(f.owner.document as unknown as Document, f.source.document as unknown as Document, f.viewport as unknown as HTMLElement);
        const layer = f.owner.document.querySelector('[data-gg-menu-frost]')!;
        expect(layer.children.length).toBe(3);
        const pane = layer.firstElementChild as HTMLElement;
        expect(pane.style.left).toBe('180px'); expect(pane.style.top).toBe('105px');
        expect(pane.style.width).toBe('480px'); expect(pane.style.height).toBe('225px');
        expect(pane.style.getPropertyValue('backdrop-filter')).toBe('blur(20px)');
        expect((layer as HTMLElement).style.getPropertyValue('backdrop-filter')).toBeFalsy();
        expect((layer as HTMLElement).style.pointerEvents).toBe('none');
        expect(f.owner.document.querySelector('#foreign')?.getAttribute('style')).toBeNull(); stop();
    });
    it('follows viewport changes and removes only owned panes/listeners on close', () => {
        const f = fixture(), stop = frostMenuSurfaces(f.owner.document as unknown as Document, f.source.document as unknown as Document, f.viewport as unknown as HTMLElement);
        f.move(); f.source.window.dispatchEvent(new f.source.window.Event('resize'));
        expect((f.owner.document.querySelector('[data-gg-menu-frost]')!.firstElementChild as HTMLElement).style.left).toBe('260px');
        stop(); stop(); f.source.window.dispatchEvent(new f.source.window.Event('resize'));
        expect(f.owner.document.querySelector('[data-gg-menu-frost]')).toBeNull();
        expect(f.owner.document.querySelector('#foreign')).not.toBeNull();
    });
    it('does not leave frosting behind if geometry acquisition fails', () => {
        const f = fixture(); f.viewport.getBoundingClientRect = () => { throw Error('view disappeared'); };
        expect(() => frostMenuSurfaces(f.owner.document as unknown as Document, f.source.document as unknown as Document, f.viewport as unknown as HTMLElement)).toThrow('view disappeared');
        expect(f.owner.document.querySelector('[data-gg-menu-frost]')).toBeNull();
    });

});
