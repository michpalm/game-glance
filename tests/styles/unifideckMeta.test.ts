import { parseHTML } from 'linkedom';
import { expect, it } from 'vitest';
import { UNIFIDECK_META } from '../../src/styles/themeCss';

// Unifideck's row as read on the Ally (2026-11-04): Play then its meta; while the game starts, Resume, Stop, then the meta.
const page = (row: string) => parseHTML(`<div class="unifideck-hide-native-play"><div><style></style>${row}<div class="_icons"><button class="unifideck-icon-btn"></button></div></div></div>`).document;

it('finds the meta items right after Play', () => {
    const doc = page('<button class="unifideck-play-btn">Play</button><div>Installed size 1.6 GB</div>');
    expect(doc.querySelectorAll(UNIFIDECK_META)).toHaveLength(1);
});
it('finds them while the game starts too, with Stop between Resume and the meta', () => {
    const doc = page('<button class="unifideck-resume-btn">Resume</button><button class="unifideck-stop-btn">✕</button><div>Installed size 1.6 GB</div>');
    const found = [...doc.querySelectorAll(UNIFIDECK_META)];
    expect(found).toHaveLength(1);
    expect(found[0].textContent).toContain('Installed size');
});
it('leaves the round buttons’ group and the buttons alone', () => {
    const doc = page('<button class="unifideck-resume-btn">Resume</button><button class="unifideck-stop-btn">✕</button><div>meta</div>');
    expect([...doc.querySelectorAll(UNIFIDECK_META)].some(el => el.className)).toBe(false);
});
