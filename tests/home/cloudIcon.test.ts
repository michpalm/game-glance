import type { ReactElement } from 'react';
import { IoCloud } from 'react-icons/io5';
import { describe, expect, it } from 'vitest';
import { CloudIcon } from '../../src/home/ActionRow';
import type { CloudState } from '../../src/home/cloud';

describe('CloudIcon (#64)', () => {
    it('is the same solid cloud in every state: the state is the badge, not the glyph', () => {
        for (const tone of ['ok', 'busy', 'bad', 'off'] as const) {
            for (const icon of [{ uploaded: true }, { save: true }, {}]) {
                const cloud = { tone, icon } as unknown as CloudState;
                expect((CloudIcon({ cloud }) as ReactElement).type).toBe(IoCloud);
            }
        }
    });
});
