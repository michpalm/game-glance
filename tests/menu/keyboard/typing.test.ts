import {describe,it,expect} from 'vitest';
import type {KeyDef} from '../../../src/menu/keyboard/layouts';
import {press,clearHeld,typeText,type TypingState} from '../../../src/menu/keyboard/typing';

const key=(char:string,more:Partial<KeyDef>={}):KeyDef=>({char,kind:'char',...more});
const A=key('a',{shifted:'A'}),B=key('b',{shifted:'B'}),K=key('k',{shifted:'K'});
const ACUTE=key('´',{dead:{next:' aAeEiIoOuUyY',combined:'´áÁéÉíÍóÓúÚýÝ'}});
const GRAVE=key('`',{dead:{next:' aAeE',combined:'`àÀèÈ'}});
const SPACE:KeyDef={char:' ',kind:'space',hint:'Spanish'};
const SHIFT:KeyDef={char:'⇧',kind:'shift'},BACKSPACE:KeyDef={char:'⌫',kind:'backspace'};
const PAGE:KeyDef={char:'?123',kind:'page'},SEND:KeyDef={char:'✓',kind:'send'};
const s0:TypingState={text:'¡Hola',shift:'off',held:null};
const seq=(s:TypingState,...ks:KeyDef[])=>ks.reduce(press,s);

describe('typing',()=>{
    it('appends a character',()=>expect(press(s0,A).text).toBe('¡Holaa'));
    it('removes one grapheme',()=>{
        expect(press({...s0,text:'está'},BACKSPACE).text).toBe('est');
        expect(press({...s0,text:'a👍🏽'},BACKSPACE).text).toBe('a');
        expect(press({...s0,text:'é'},BACKSPACE).text).toBe('');
        expect(press({...s0,text:''},BACKSPACE).text).toBe('');
    });
    it('shift once types one capital then returns to off',()=>{
        const s=seq(s0,SHIFT,A,A);
        expect(s.text).toBe('¡HolaAa');expect(s.shift).toBe('off');
    });
    it('shift pressed while once goes to lock; lock goes to off',()=>{
        const l=seq(s0,SHIFT,SHIFT);
        expect(l.shift).toBe('lock');
        expect(seq(l,A,B).text).toBe('¡HolaAB');
        expect(seq(l,A,B).shift).toBe('lock');
        expect(press(l,SHIFT).shift).toBe('off');
    });
    it('shift uses char.toUpperCase when shifted is missing',()=>{
        expect(seq(s0,SHIFT,key('ñ')).text).toBe('¡HolaÑ');
    });
    it('combines a held accent',()=>{
        const h=press(s0,ACUTE);
        expect(h.held).toBe(ACUTE);expect(h.text).toBe('¡Hola');
        const s=press(h,A);
        expect(s.text).toBe('¡Holaá');expect(s.held).toBeNull();
    });
    it('shift once applies to a combined accent',()=>{
        const s=seq(s0,ACUTE,SHIFT,A);
        expect(s.text).toBe('¡HolaÁ');expect(s.shift).toBe('off');
    });
    it('an accent with no combination types the accent then the key',()=>{
        const s=seq(s0,ACUTE,K);
        expect(s.text).toBe('¡Hola´k');expect(s.held).toBeNull();
    });
    it('space after an accent types the accent alone',()=>{
        expect(seq(s0,ACUTE,SPACE).text).toBe('¡Hola´');
    });
    it('space without an accent types a space',()=>expect(press(s0,SPACE).text).toBe('¡Hola '));
    it('a second accent types the first and holds the second',()=>{
        const s=seq(s0,ACUTE,GRAVE);
        expect(s.text).toBe('¡Hola´');expect(s.held).toBe(GRAVE);
        expect(press(s,A).text).toBe('¡Hola´à');
    });
    it('shift keeps a held accent',()=>{
        const s=seq(s0,ACUTE,SHIFT);
        expect(s.held).toBe(ACUTE);expect(s.shift).toBe('once');
    });
    it('backspace drops a held accent without deleting text',()=>{
        const s=seq(s0,ACUTE,BACKSPACE);
        expect(s.text).toBe('¡Hola');expect(s.held).toBeNull();
    });
    it('page and send leave the state unchanged',()=>{
        const h=press(s0,ACUTE);
        expect(press(h,PAGE)).toEqual(h);expect(press(h,SEND)).toEqual(h);
    });
    it('clearHeld drops a held accent only',()=>{
        const h={...press(s0,ACUTE),shift:'lock' as const};
        expect(clearHeld(h)).toEqual({text:'¡Hola',shift:'lock',held:null});
    });
    it('typeText appends with no accent logic',()=>{
        expect(typeText(s0,'´a')).toEqual({...s0,text:'¡Hola´a'});
    });
    it('does not mutate its input',()=>{
        const s={...s0};press(s,A);expect(s).toEqual(s0);
    });
});
