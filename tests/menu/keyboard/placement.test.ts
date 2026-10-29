import {describe,it,expect} from 'vitest';
import {SPOTS,spotPosition,settle,loadPosition,savePosition,dragPosition,stickVelocity,normaliseAxis,stickStep,STICK_Y_UP_IS_POSITIVE,underKeyboard,markUnderKeyboard,watchUnderKeyboard,followUnderKeyboard,movePanel,type Rect} from '../../../src/menu/keyboard/placement';
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

describe('stickVelocity',()=>{
    it('is zero inside the radial dead zone',()=>expect(stickVelocity(.1,.1)).toEqual({x:0,y:0}));
    it('reaches 900 px/s at full deflection',()=>expect(stickVelocity(1,0)).toEqual({x:900,y:0}));
    it('curves: half way past the dead zone is less than half speed',()=>{
        const half=stickVelocity(.15+.85/2,0).x;
        expect(half).toBeGreaterThan(0);
        expect(half).toBeLessThan(450);
        expect(half).toBeCloseTo(225);
    });
    it('keeps the direction of a diagonal push',()=>{
        const v=stickVelocity(.6,-.6);
        expect(v.x).toBeGreaterThan(0);
        expect(v.y).toBeCloseTo(-v.x);
    });
    it('caps past full deflection',()=>expect(Math.hypot(...Object.values(stickVelocity(1,1)))).toBeCloseTo(900));
});

describe('normaliseAxis',()=>{
    it('maps the raw 16-bit range to -1..1',()=>{
        expect(normaliseAxis(32767)).toBe(1);
        expect(normaliseAxis(-32768)).toBe(-1);
    });
    it('leaves a normalised value alone',()=>expect(normaliseAxis(.5)).toBe(.5));
    it('clamps a value just past 1 and treats a larger one as raw',()=>{
        expect(normaliseAxis(1.2)).toBe(1);
        expect(normaliseAxis(-1.4)).toBe(-1);
        expect(normaliseAxis(2)).toBeCloseTo(2/32767);
    });
    it('reads garbage as rest',()=>{
        expect(normaliseAxis(NaN)).toBe(0);
        expect(normaliseAxis(undefined as unknown as number)).toBe(0);
    });
});

describe('stickStep',()=>{
    it('turns a stick reading into a screen delta for the elapsed time, stick up moving the panel up',()=>{
        expect(STICK_Y_UP_IS_POSITIVE).toBe(true);
        expect(stickStep({x:32767,y:0},.5)).toEqual({x:450,y:0});
        expect(stickStep({x:0,y:1},.1).y).toBeCloseTo(-90);
        expect(stickStep({x:.05,y:0},1)).toEqual({x:0,y:0});
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

describe('what the keyboard covers',()=>{
    const kb:Rect={x:100,y:100,width:50,height:50};
    const at=(x:number,y:number,width=20,height=20):Rect=>({x,y,width,height});
    it('picks the candidates whose rect overlaps the keyboard',()=>{
        const a={el:'a',rect:at(140,140)},b={el:'b',rect:at(0,0)},c={el:'c',rect:at(90,90,20,20)};
        expect(underKeyboard(kb,[a,b,c])).toEqual(['a','c']);
    });
    it('treats touching edges as no overlap, and none as empty',()=>{
        expect(underKeyboard(kb,[{el:'r',rect:at(150,100)},{el:'l',rect:at(80,100)},{el:'t',rect:at(100,80)},{el:'d',rect:at(100,150)}])).toEqual([]);
        expect(underKeyboard(kb,[])).toEqual([]);
    });
    const fake=(r:Rect)=>{const set=new Set<string>();return {set,getBoundingClientRect:()=>r,classList:{toggle:(c:string,on:boolean)=>{on?set.add(c):set.delete(c);},remove:(c:string)=>{set.delete(c);}}};};
    it('marks only the covered columns and the cleanup clears them',()=>{
        const under=fake(at(120,120)),away=fake(at(0,0));
        const root={querySelectorAll:()=>[under,away]};
        const clear=markUnderKeyboard(root as never,fake(kb) as never);
        expect([...under.set]).toEqual(['gg-keyboard-under']); expect([...away.set]).toEqual([]);
        clear();
        expect([...under.set]).toEqual([]);
    });
});

describe('watchUnderKeyboard',()=>{
    type Cb=()=>void;
    const mk=()=>{
        const rects:{kb:Rect;col:Rect}={kb:{x:0,y:0,width:10,height:10},col:{x:100,y:100,width:20,height:20}};
        const set=new Set<string>(),toggles:boolean[]=[];
        const col={getBoundingClientRect:()=>rects.col,classList:{toggle:(c:string,on:boolean)=>{toggles.push(on);on?set.add(c):set.delete(c);},remove:(c:string)=>{set.delete(c);}}};
        const panel={getBoundingClientRect:()=>rects.kb};
        const root={querySelectorAll:()=>[col]};
        let frame:Cb|null=null,cancelled:number[]=[],resize:Cb|null=null,observed:unknown[]=[],disconnected=0;
        const view={requestAnimationFrame:(f:Cb)=>{frame=f;return 7;},cancelAnimationFrame:(n:number)=>{cancelled.push(n);frame=null;},
            ResizeObserver:class{constructor(cb:Cb){resize=cb;}observe(e:unknown){observed.push(e);}disconnect(){disconnected++;}}};
        return {rects,set,toggles,col,panel,root,view,runFrame:()=>{const f=frame;frame=null;f?.();},fireResize:()=>resize?.(),observed,get disconnected(){return disconnected;},cancelled};
    };
    it('marks at once and again on the next frame when the rects have changed',()=>{
        const t=mk();
        watchUnderKeyboard(t.root as never,t.panel as never,t.view as never);
        expect([...t.set]).toEqual([]);
        t.rects.kb={x:100,y:100,width:30,height:30};
        t.runFrame();
        expect([...t.set]).toEqual(['gg-keyboard-under']);
    });
    it('marks again when the panel or a column resizes, touching classes only when the set changes',()=>{
        const t=mk();
        t.rects.kb={x:100,y:100,width:30,height:30};
        watchUnderKeyboard(t.root as never,t.panel as never,t.view as never);
        expect(t.observed).toEqual([t.panel,t.col]);
        const n=t.toggles.length;
        t.fireResize(); expect(t.toggles.length).toBe(n);
        t.rects.kb={x:0,y:0,width:10,height:10};
        t.fireResize();
        expect([...t.set]).toEqual([]);
    });
    it('stop clears the classes, disconnects and cancels the pending frame',()=>{
        const t=mk();
        t.rects.kb={x:100,y:100,width:30,height:30};
        const stop=watchUnderKeyboard(t.root as never,t.panel as never,t.view as never);
        expect([...t.set]).toEqual(['gg-keyboard-under']);
        stop();
        expect([...t.set]).toEqual([]);
        expect(t.disconnected).toBe(1);
        expect(t.cancelled).toEqual([7]);
    });
    it('follows only while not dragging: a drag clears every mark and watches nothing until it is dropped',()=>{
        const t=mk();
        t.rects.kb={x:100,y:100,width:30,height:30};
        const stop=followUnderKeyboard(t.root as never,t.panel as never,t.view as never,false);
        expect([...t.set]).toEqual(['gg-keyboard-under']);
        stop();
        const idle=followUnderKeyboard(t.root as never,t.panel as never,t.view as never,true);
        expect([...t.set]).toEqual([]);
        expect(t.observed).toEqual([t.panel,t.col]);
        t.runFrame(); t.fireResize();
        expect([...t.set]).toEqual([]);
        idle();
        followUnderKeyboard(t.root as never,t.panel as never,t.view as never,false);
        expect([...t.set]).toEqual(['gg-keyboard-under']);
    });
});

describe('movePanel',()=>{
    it('writes the position straight onto the panel’s style and the live position, without React',()=>{
        const style={left:'',top:''},live={position:{x:0,y:0}};
        movePanel({style} as never,live,{x:12.5,y:40});
        expect(style).toEqual({left:'12.5px',top:'40px'});
        expect(live.position).toEqual({x:12.5,y:40});
        movePanel(null,live,{x:1,y:2});
        expect(live.position).toEqual({x:1,y:2});
    });
});
