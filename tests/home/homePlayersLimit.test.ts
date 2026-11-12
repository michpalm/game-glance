import { describe, expect, it } from 'vitest';
import { parseHTML } from 'linkedom';
import { homePlayersLimit } from '../../src/home/openHome';
import { DEFAULT_SLOTS } from '../../src/logic/infoSlots';

describe('homePlayersLimit', () => {
    it("gives no line (the row) when Home can't be measured, and never throws", () => {
        const { document } = parseHTML('<div class="gh-root"></div>');
        expect(homePlayersLimit(document.querySelector('.gh-root') as unknown as Element, 'spotlight', DEFAULT_SLOTS)).toBeNull();
        expect(homePlayersLimit(document.querySelector('.gh-root') as unknown as Element, 'clean', DEFAULT_SLOTS)).toBeNull();
    });
});
