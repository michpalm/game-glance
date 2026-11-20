import { describe, expect, it } from 'vitest';
import { formatBytes } from '../../src/logic/format';
import { installSizeText, knownSizeLabel, rememberSizeLabel, resetSizeLabels, sizeStat, steamSpaceStat } from '../../src/logic/sizeStat';

const GB = 1024 ** 3;

describe('formatBytes', () => {
    it('uses binary units, one decimal under 100, like Unifideck', () => {
        expect(formatBytes(3.2 * GB, 'en-US')).toBe('3.2 GB');
        expect(formatBytes(512 * 1024 ** 2, 'en-US')).toBe('512 MB');
        expect(formatBytes(1536, 'en-US')).toBe('1.5 KB');
        expect(formatBytes(150 * GB, 'en-US')).toBe('150 GB');
        expect(formatBytes(2 * 1024 ** 4, 'en-US')).toBe('2.0 TB');
    });
    it('follows the locale’s decimal mark', () => {
        expect(formatBytes(3.2 * GB, 'de-DE')).toBe('3,2 GB');
    });
    it('is null when unknown, never 0 B', () => {
        for (const bad of [0, -5, NaN, Infinity, null, undefined, '5']) expect(formatBytes(bad, 'en-US')).toBeNull();
    });
});

describe('sizeStat', () => {
    it("labels as Unifideck's English does: Installed size when installed, Space required when not", () => {
        expect(sizeStat(3.2 * GB, true, 'en-US')).toEqual({ key: 'size', label: 'Installed size', value: '3.2 GB' });
        expect(sizeStat(3.2 * GB, false, 'en-US')).toEqual({ key: 'size', label: 'Space required', value: '3.2 GB' });
    });
    it('is null with no known size', () => {
        expect(sizeStat(null, true, 'en-US')).toBeNull();
        expect(sizeStat(undefined, false, 'en-US')).toBeNull();
        expect(sizeStat(0, true, 'en-US')).toBeNull();
    });
});

describe('the size label memo', () => {
    it("remembers Unifideck's own word (read from its row on the page) per install state, for Home's open", () => {
        resetSizeLabels();
        expect(knownSizeLabel(false)).toBeNull();
        rememberSizeLabel(false, 'Espacio requerido');
        rememberSizeLabel(true, 'Tamaño instalado');
        expect(knownSizeLabel(false)).toBe('Espacio requerido');
        expect(knownSizeLabel(true)).toBe('Tamaño instalado');
        rememberSizeLabel(true, '  ');
        expect(knownSizeLabel(true)).toBe('Tamaño instalado');
    });
});

describe("a Steam game that is not installed: its space required", () => {
    it("shows Steam's own 'Space Required' label (in its language) when Steam reports no size on disk", () => {
        expect(steamSpaceStat({ appid: 1455840 }, 691079517, 'en', 'Space Required')).toEqual({ key: 'size', label: 'Space Required', value: formatBytes(691079517, 'en') });
        expect(steamSpaceStat({ size_on_disk: 0 }, 691079517, 'es', 'Espacio necesario')?.label).toBe('Espacio necesario');
    });
    it('shows nothing for an installed game, or when the space is not known', () => {
        expect(steamSpaceStat({ size_on_disk: '11058189790' }, 691079517, 'en', 'Space Required')).toBeNull();
        expect(steamSpaceStat({ appid: 1455840 }, undefined, 'en', 'Space Required')).toBeNull();
        expect(steamSpaceStat({ appid: 1455840 }, null, 'en', 'Space Required')).toBeNull();
    });
});

describe('installSizeText (the Install pill\'s right end)', () => {
    it("a Steam game that is not installed: Steam's size", () => {
        expect(installSizeText({ installed: false, downloading: false, steamBytes: 2424009225 }, 'en-US')).toBe(formatBytes(2424009225, 'en-US'));
    });
    it('none while installed, downloading, or with the size unknown', () => {
        expect(installSizeText({ installed: true, downloading: false, steamBytes: 2424009225 }, 'en-US')).toBeNull();
        expect(installSizeText({ installed: false, downloading: true, steamBytes: 2424009225 }, 'en-US')).toBeNull();
        expect(installSizeText({ installed: false, downloading: false, steamBytes: null }, 'en-US')).toBeNull();
        expect(installSizeText({ installed: false, downloading: false, steamBytes: 0 }, 'en-US')).toBeNull();
    });
    it("a Unifideck game: Unifideck's own install state and size (Steam reads a shortcut as installed)", () => {
        expect(installSizeText({ installed: true, downloading: false, steamBytes: null, unifideck: { installed: false, bytes: 3 * GB } }, 'en-US')).toBe(formatBytes(3 * GB, 'en-US'));
        expect(installSizeText({ installed: true, downloading: false, steamBytes: null, unifideck: { installed: true, bytes: 3 * GB } }, 'en-US')).toBeNull();
        expect(installSizeText({ installed: true, downloading: true, steamBytes: null, unifideck: { installed: false, bytes: 3 * GB } }, 'en-US')).toBeNull();
    });
});
