import { describe, expect, it } from 'vitest';
import { fillTemplate, PHRASES, steamToken, tr } from '../../src/i18n/steamText';

const tokens = (locale: string, table: Record<string, string>) => ({
    GetPreferredLocales: () => [locale],
    LocalizeString: (t: string) => table[t.slice(1)],
});
const es = tokens('es', { Time_Today: 'Hoy', TimeSince_XDays: 'hace %1$s días', AppDetails_SectionTitle_LastPlayed: 'Última sesión', LibraryHome_RecentlyCompleted_DownloadDate: 'Actualizado: %1$s' });

describe('steamToken', () => {
    it('is Steam’s text in another language, undefined for an unknown token', () => {
        expect(steamToken('Time_Today', es)).toBe('Hoy');
        expect(steamToken('Nope', es)).toBeUndefined();
    });
    it('is undefined without a table, on any failure, or for an empty text', () => {
        expect(steamToken('Time_Today', undefined)).toBeUndefined();
        expect(steamToken('Time_Today', { LocalizeString: () => { throw new Error('x'); } })).toBeUndefined();
        expect(steamToken('Time_Today', tokens('es', { Time_Today: '' }))).toBeUndefined();
    });
    it('follows Steam in English too ("Play Time" for Played)', () => {
        expect(steamToken('AppDetails_SectionTitle_PlayTime', tokens('en', { AppDetails_SectionTitle_PlayTime: 'Play Time' }))).toBe('Play Time');
    });
});

describe('fillTemplate', () => {
    it('fills numbered values, in any order, and refuses a template with a value missing', () => {
        expect(fillTemplate('hace %1$s días', [3])).toBe('hace 3 días');
        expect(fillTemplate('%2$s of %1$s', ['a', 'b'])).toBe('b of a');
        expect(fillTemplate('hace %1$s días', [])).toBeNull();
        expect(fillTemplate('plain', [])).toBe('plain');
    });
});

describe('tr', () => {
    it('speaks Steam’s language with the values in', () => {
        expect(tr('lastPlayed', [], es)).toBe('Última sesión');
        expect(tr('daysAgo', [3], es)).toBe('hace 3 días');
        expect(tr('updated', ['Hoy'], es)).toBe('Actualizado: Hoy');
    });
    it('falls back to our English: no table, a missing token, a template short of values', () => {
        expect(tr('lastPlayed', [], undefined)).toBe('Last played');
        expect(tr('played', [], tokens('en', { AppDetails_SectionTitle_PlayTime: 'Play Time' }))).toBe('Play Time');
        expect(tr('achievements', [], es)).toBe('Achievements'); // es has no token for it
        expect(tr('daysAgo', [], es)).toBe('%1$s days ago'); // cannot be filled: never a broken sentence (English template as is)
    });
    it('every phrase has a token and English text, and no token is used twice', () => {
        const all = Object.values(PHRASES);
        for (const phrase of all) {
            expect(phrase.token).toMatch(/^[A-Za-z0-9_]+$/);
            expect(phrase.en.length).toBeGreaterThan(0);
        }
        expect(new Set(all.map((x) => x.token)).size).toBe(all.length);
    });
});
