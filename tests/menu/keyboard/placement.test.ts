import {describe,it,expect} from 'vitest';
import {SPOTS,spotPosition,settle,loadPosition,savePosition,dragPosition,type Rect} from '../../../src/menu/keyboard/placement';
import {memoryKv} from '../../../src/data/kv';

const view:Rect={x:0,y:0,width:829,height:467};
const menu:Rect={x:166,y:119,width:498,height:309};
const field:Rect={x:378,y:350,width:116,height:60};
const size={width:265,height:136};
const inside=(p:{x:number;y:number},v:Rect)=>p.x>=v.x&&p.y>=v.y&&p.x+size.width<=v.x+v.width&&p.y+size.height<=v.y+v.height;
const clear=(p:{x:number;y:number},f:Rect)=>p.x+size.width<=f.x||p.x>=f.x+f.width||p.y+size.height<=f.y||p.y>=f.y+f.height;

describe('spotPosition',()=>{
    it('lists the three spots',()=>expect([...SPOTS]).toEqual(['left','right','top']));
    it.each(SPOTS)('%s lies inside the view and clear of the field',s=>{
        const p=spotPosition(s,view,menu,field,size);
        expect(inside(p,view)).toBe(true);
        expect(clear(p,field)).toBe(true);
    });
    it('places each spot by its formula',()=>{
        expect(spotPosition('left',view,menu,field,size)).toEqual({x:97,y:274});
        expect(spotPosition('right',view,menu,field,size)).toEqual({x:383,y:198});
        expect(spotPosition('top',view,menu,field,size)).toEqual({x:282.5,y:135});
    });
});

describe('dragPosition',()=>{
    // While dragging the panel stays inside the view (the frost of the whole menu depends on it); only release clears the field.
    it('follows the pointer in menu units, clamped inside the view',()=>{
        expect(dragPosition({x:100,y:100},{x:20,y:-10},.5,view,size)).toEqual({x:140,y:80});
        expect(dragPosition({x:100,y:100},{x:-900,y:-900},1,view,size)).toEqual({x:0,y:0});
        expect(dragPosition({x:100,y:100},{x:9000,y:9000},1,view,size)).toEqual({x:564,y:331});
    });
    it('does not slide clear of the field while dragging',()=>{
        expect(dragPosition({x:378,y:300},{x:0,y:0},1,view,size)).toEqual({x:378,y:300});
    });
});

describe('settle',()=>{
    it('leaves a good position alone',()=>expect(settle({x:10,y:10},view,field,size)).toEqual({x:10,y:10}));
    it('clamps at each edge',()=>{
        expect(settle({x:-50,y:-50},view,field,size)).toEqual({x:0,y:0});
        expect(settle({x:900,y:500},view,field,size)).toEqual({x:564,y:331});
        expect(settle({x:0,y:500},view,field,size)).toEqual({x:0,y:331});
        expect(settle({x:900,y:0},view,field,size)).toEqual({x:564,y:0});
    });
    it('moves a drop over the field by the smallest shift',()=>{
        expect(settle({x:300,y:300},view,field,size)).toEqual({x:300,y:214});
    });
    it('skips shifts that leave the view',()=>{
        const p=settle({x:335,y:264},{x:0,y:0,width:600,height:400},field,size);
        expect(p).toEqual({x:335,y:214});
    });
    it('clamps a saved position beyond a smaller view, then clears the field',()=>{
        const small:Rect={x:0,y:0,width:600,height:400};
        expect(settle({x:700,y:500},small,field,size)).toEqual({x:335,y:214});
        expect(settle({x:-40,y:-30},small,field,size)).toEqual({x:0,y:0});
    });
    it('keeps the clamped position when nothing fits',()=>{
        const tiny:Rect={x:0,y:0,width:300,height:150};
        const f:Rect={x:0,y:0,width:300,height:150};
        expect(settle({x:20,y:5},tiny,f,size)).toEqual({x:20,y:5});
    });
});

describe('remembered position',()=>{
    it('round-trips a spot and a point',async()=>{
        const kv=memoryKv();
        await savePosition(kv,{spot:'right'});
        expect(await loadPosition(kv)).toEqual({spot:'right'});
        await savePosition(kv,{x:12,y:34});
        expect(await loadPosition(kv)).toEqual({x:12,y:34});
        expect(await kv.get('menu:keyboard')).toEqual({x:12,y:34});
    });
    it('never rejects when the store fails',async()=>{
        const kv={...memoryKv(),set:()=>Promise.reject(new Error('backend gone'))};
        await expect(savePosition(kv,{spot:'left'})).resolves.toBeUndefined();
        const throws={...memoryKv(),set:()=>{throw new Error('sync');}};
        await expect(savePosition(throws,{x:1,y:2})).resolves.toBeUndefined();
    });
    it('loads null when nothing is stored',async()=>expect(await loadPosition(memoryKv())).toBeNull());
    it.each([
        'text',5,[],{spot:'middle'},{spot:1},{x:1},{x:'1',y:2},{x:NaN,y:0},{x:Infinity,y:0},{spot:'left',x:1,y:2},{x:1,y:2,z:3},
    ])('loads %j as null',async v=>{
        const kv=memoryKv();
        await kv.set('menu:keyboard',v);
        expect(await loadPosition(kv)).toBeNull();
    });
    it('loads null when kv throws',async()=>{
        const kv={...memoryKv(),get:async()=>{throw new Error('x');}};
        expect(await loadPosition(kv)).toBeNull();
    });
});
