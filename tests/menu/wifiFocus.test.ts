import { expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { focusTarget } from '../../src/menu/components/wifiFocus';

it('focuses the control inside a keyed wrapper, as the menu finds focus', () => {
    const { document } = parseHTML('<div><div id="w" data-gg-focus="wifi:switch"><div class="Focusable" id="t"></div></div><button id="b" data-gg-focus="wifi:x"></button></div>');
    expect(focusTarget(document.getElementById('w') as unknown as HTMLElement)?.id).toBe('t');
    expect(focusTarget(document.getElementById('b') as unknown as HTMLElement)?.id).toBe('b');
    expect(focusTarget(null)).toBeNull();
});
