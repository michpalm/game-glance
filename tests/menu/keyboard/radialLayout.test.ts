import {expect,it} from 'vitest';
import {buildRadialLayout} from '../../../src/menu/keyboard/radialLayout';
import {BUILTIN_QWERTY,compactLayout} from '../../../src/menu/keyboard/layouts';
import {SPANISH_ROWS} from './spanish.fixture';
it('keeps every Spanish letter and both accents reachable without truncating symbols',()=>{
 const layout=compactLayout({name:'spanish',layout:19,rgLayout:()=>SPANISH_ROWS})!;
 const before=JSON.stringify(layout),r=buildRadialLayout(layout);
 expect(r.letters.map(s=>s.map(k=>k.char).join(''))).toEqual(['wertgfdbvcxzasq','uiopçñlkmnhjy']);
 expect(new Set(r.letters.flat().map(k=>k.char)).size).toBe(28);
 expect(r.symbols.flat().some(k=>k.char==='´'&&k.dead)).toBe(true);
 expect(r.symbols.flat().some(k=>k.char==='¨'&&k.dead)).toBe(true);
 expect(r.symbols.flat().filter(k=>k.kind!=='char')).toEqual([]);
 expect(r.symbols.flat().length).toBeGreaterThan(28);
 expect(JSON.stringify(layout)).toBe(before);
});
it('keeps QWERTY letters on their typing hand with top and bottom row arcs',()=>{
 const r=buildRadialLayout(BUILTIN_QWERTY);
 expect(r.letters.map(s=>s.length)).toEqual([15,11]);
 expect(r.letters.map(side=>side.map(k=>k.char).join(''))).toEqual(['wertgfdbvcxzasq','uioplkmnhjy']);
 expect(r.letters.flat().map(k=>k.char).sort().join('')).toBe('abcdefghijklmnopqrstuvwxyz');
 expect(r.letters[0][1].char).toBe('e');expect(r.letters[1][1].char).toBe('i');
 for(const key of r.letters.flat())expect(BUILTIN_QWERTY.letters.flat()).toContain(key);
 expect(r.letters.flat().find(k=>k.char==='a')?.shifted).toBe('A');
});

it('keeps Swedish extra letters on the right without changing the source layout',()=>{
 const chars=(text:string)=>[...text].map(char=>({char,shifted:char.toUpperCase(),kind:'char' as const}));
 const layout={...BUILTIN_QWERTY,name:'swedish',letters:[chars('qwertyuiopå'),chars('asdfghjklöä'),chars('zxcvbnm')]};
 const before=JSON.stringify(layout),r=buildRadialLayout(layout);
 expect(r.letters.map(side=>side.map(k=>k.char).join(''))).toEqual(['wertgfdbvcxzasq','uiopåäölkmnhjy']);
 expect(r.letters.map(side=>side.length)).toEqual([15,14]);
 expect(JSON.stringify(layout)).toBe(before);
});

it('retains the generic mapping when letter-only rows do not describe a QWERTY-family hand split',()=>{
 const chars=(text:string)=>[...text].map(char=>({char,kind:'char' as const}));
 const layout={...BUILTIN_QWERTY,name:'dvorak',letters:[chars('pyfgcrl'),chars('aoeuidhtns'),chars('qjkxbmwvz')]};
 const r=buildRadialLayout(layout);
 expect(r.letters.map(side=>side.map(k=>k.char).join(''))).toEqual(['pyfgiueoaqjkx','crlsnthdbmwvz']);
});
