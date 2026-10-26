import { describe, expect, it, vi } from 'vitest';
import { parseHTML } from 'linkedom';
import { findStoreSwitcher, openStoreSwitcher } from '../../src/logic/storeSwitcher';

function fixture(siblings = [{ appId: 123 }, { appId: -2 }]) {
    const { document } = parseHTML('<div><button role="combobox">Steam</button></div><button role="combobox">Unrelated dropdown</button>');
    const button = document.querySelector('button') as unknown as HTMLElement;
    Object.assign(button, { __reactFiberTest: { return: { memoizedProps: { appId: 123, siblings }, type: { name: 'GameStoreSwitcher' } } } });
    return { document: document as unknown as Document, button };
}

describe('Unifideck store selector', () => {
    it('only finds a multi-store switcher owned by the current game', () => {
        const { document, button } = fixture();
        expect(findStoreSwitcher(document, 123)).toBe(button);
        expect(findStoreSwitcher(document, 456)).toBeNull();
        expect(findStoreSwitcher(fixture([{ appId: 123 }]).document, 123)).toBeNull();
    });
    it('opens the original dropdown anchored to the Store pill', () => {
        const { button } = fixture();
        const click = vi.spyOn(button, 'click');
        openStoreSwitcher(button, { left: 500, top: 200, width: 90, height: 32 });
        expect(button.parentElement!.style.left).toBe('500px');
        expect(button.parentElement!.style.top).toBe('200px');
        expect(click).toHaveBeenCalledOnce();
        button.remove();
        openStoreSwitcher(button, { left: 0, top: 0, width: 0, height: 0 });
        expect(click).toHaveBeenCalledOnce();
    });
});
