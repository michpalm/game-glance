import {expect,it} from 'vitest';
import {buildRadialLayout} from '../../../src/menu/keyboard/radialLayout';
import {BUILTIN_QWERTY,compactLayout} from '../../../src/menu/keyboard/layouts';
import {SPANISH_ROWS} from './spanish.fixture';
it('keeps every Spanish letter and both accents reachable without truncating symbols',()=>{
 const layout=compactLayout({name:'spanish',layout:19,rgLayout:()=>SPANISH_ROWS})!;
 const before=JSON.stringify(layout),r=buildRadialLayout(layout);
 expect(r.letters.map(s=>s.map(k=>k.char).join(''))).toEqual(['qwertçgfdsazxc','yuiopñlkjhvbnm']);
 expect(new Set(r.letters.flat().map(k=>k.char)).size).toBe(28);
 expect(r.symbols.flat().some(k=>k.char==='´'&&k.dead)).toBe(true);
 expect(r.symbols.flat().some(k=>k.char==='¨'&&k.dead)).toBe(true);
 expect(r.symbols.flat().filter(k=>k.kind!=='char')).toEqual([]);
 expect(r.symbols.flat().length).toBeGreaterThan(28);
 expect(JSON.stringify(layout)).toBe(before);
});
it('balances generic layouts without dropping characters or shifted metadata',()=>{
 const r=buildRadialLayout(BUILTIN_QWERTY);
 expect(r.letters.map(s=>s.length)).toEqual([13,13]);
 expect(r.letters.flat().map(k=>k.char).sort().join('')).toBe('abcdefghijklmnopqrstuvwxyz');
 expect(r.letters.flat().find(k=>k.char==='a')?.shifted).toBe('A');
});
