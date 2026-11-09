import {expect,it} from 'vitest';
import {selectRadial} from '../../../src/menu/keyboard/radialSelection';
it('selects clockwise with the second letter at the top and clears on centring',()=>{
 expect(selectRadial(null,{x:0,y:1},14)).toBe(1);
 expect(selectRadial(null,{x:1,y:0},14)).toBe(5);
 expect(selectRadial(null,{x:0,y:-1},14)).toBe(8);
 expect(selectRadial(null,{x:-1,y:0},14)).toBe(12);
 expect(selectRadial(3,{x:0,y:.1},14)).toBeNull();
 expect(selectRadial(null,{x:0,y:.4},14)).toBeNull();
 expect(selectRadial(1,{x:0,y:.4},14)).toBe(1);
});
it('retains a wedge near its boundary and rejects invalid axes/counts',()=>{
 const angle=-Math.PI/2+Math.PI/14+.01;
 expect(selectRadial(1,{x:Math.cos(angle),y:-Math.sin(angle)},14)).toBe(1);
 expect(selectRadial(null,{x:Math.cos(angle),y:-Math.sin(angle)},14)).toBe(2);
 for(const a of [{x:NaN,y:0},{x:Infinity,y:1}])expect(selectRadial(1,a,14)).toBeNull();
 expect(selectRadial(null,{x:1,y:0},0)).toBeNull();
});
