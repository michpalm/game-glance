import { describe, expect, it } from 'vitest';
import { htmlToText } from '../../src/logic/text';

describe('htmlToText', () => {
    it('removes tags and turns breaks into spaces', () => {
        expect(htmlToText('Hunt <b>monsters</b><br/>for coin.')).toBe('Hunt monsters for coin.');
    });
    it('decodes named and numeric entities', () => {
        expect(htmlToText('Tom &amp; Jerry &quot;live&quot; &#39;now&#39; &#x2014; &lt;3&nbsp;!')).toBe('Tom & Jerry "live" \'now\' — <3 !');
    });
    it('keeps unknown or invalid entities as written', () => {
        expect(htmlToText('a &bogus; b &#99999999; c')).toBe('a &bogus; b &#99999999; c');
    });
    it('collapses whitespace', () => {
        expect(htmlToText('  a \n\t b  ')).toBe('a b');
    });
});
