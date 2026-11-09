import {expect,it} from 'vitest';
import {createRadialInput,applyRadialCommand,type ButtonsSnapshot,type AxesSnapshot} from '../../../src/menu/keyboard/radialInput';
import {buildRadialLayout} from '../../../src/menu/keyboard/radialLayout';
import {BUILTIN_QWERTY,type KeyDef} from '../../../src/menu/keyboard/layouts';
const layout=buildRadialLayout(BUILTIN_QWERTY);
export const buttons=():ButtonsSnapshot=>({nControllerIndex:0,bLeftStickClick:false,bRightStickClick:false,bLeftTrigger:false,bRightTrigger:false,bLeftBumper:false,bRightBumper:false,bButtonNorth:false,bButtonEast:false,bButtonSouth:false,bButtonWest:false});
export const axes=():AxesSnapshot=>({nControllerIndex:0,LeftJoystick:{x:0,y:1},RightJoystick:{x:0,y:1}});
it('reads both sticks independently and types once per click edge, never at centre',()=>{
 const input=createRadialInput(),b=buttons(),a=axes();input.sample(a,b,layout);
 b.bLeftStickClick=b.bRightStickClick=true;
 expect(input.sample(a,b,layout).commands.filter(c=>c.type==='key')).toHaveLength(2);
 expect(input.sample(a,b,layout).commands).toEqual([]);
 b.bLeftStickClick=b.bRightStickClick=false;input.sample(a,b,layout);
 a.LeftJoystick={x:0,y:0};b.bLeftStickClick=true;
 const result=input.sample(a,b,layout);expect(result.selection[0]).toBeNull();expect(result.commands).toEqual([]);
});
it('does not act on buttons held at activation and does not repeat face actions',()=>{
 const input=createRadialInput(),b={...buttons(),bButtonSouth:true,bLeftStickClick:true},a=axes();
 expect(input.sample(a,b,layout).commands).toEqual([]);expect(input.sample(a,b,layout).commands).toEqual([]);
 b.bButtonSouth=b.bLeftStickClick=false;input.sample(a,b,layout);b.bButtonSouth=true;
 expect(input.sample(a,b,layout).commands).toEqual([{type:'send'}]);
 expect(input.sample(a,b,layout).commands).toEqual([]);
});
it('handles independent layers, uppercase, layout rearming and close priority',()=>{
 const input=createRadialInput(),b=buttons(),a=axes();input.sample(a,b,layout);
 b.bLeftTrigger=true;b.bLeftBumper=true;
 expect(input.sample(a,b,layout)).toMatchObject({extra:[true,false],uppercase:true});
 b.bRightBumper=true;b.bLeftStickClick=true;
 expect(input.sample(a,b,layout).commands).toEqual([{type:'layout'}]);
 b.bRightBumper=b.bLeftStickClick=false;input.sample(a,b,layout);b.bLeftStickClick=true;
 expect(input.sample(a,b,layout).commands).toEqual([]);
 a.LeftJoystick={x:0,y:0};b.bLeftStickClick=false;input.sample(a,b,layout);
 a.LeftJoystick={x:0,y:1};b.bLeftStickClick=true;
 expect(input.sample(a,b,layout).commands[0].type).toBe('key');
 b.bButtonSouth=b.bButtonWest=true;
 expect(input.sample(a,b,layout).commands).toEqual([{type:'close'}]);
});
it('composes accents across trigger release and applies uppercase only to letters',()=>{
 const acute:KeyDef={char:'´',kind:'char',dead:{next:' aA',combined:'´áÁ'}};
 let s={text:'',shift:'off' as const,held:null as KeyDef|null};
 s=applyRadialCommand(s,{type:'key',key:acute,uppercase:false}) as typeof s;
 s=applyRadialCommand(s,{type:'key',key:{char:'a',shifted:'A',kind:'char'},uppercase:true}) as typeof s;
 expect(s.text).toBe('Á');
 s=applyRadialCommand(s,{type:'key',key:{char:'a',shifted:'A',kind:'char'},uppercase:false}) as typeof s;expect(s.text).toBe('Áa');
 s=applyRadialCommand(s,{type:'key',key:{char:'1',shifted:'!',kind:'char'},uppercase:true}) as typeof s;expect(s.text).toBe('Áa1');
 expect(applyRadialCommand({...s,text:'hi👩‍🚀'},{type:'delete'}).text).toBe('hi');
 expect(applyRadialCommand({...s,text:'',held:acute},{type:'space'}).text).toBe('´');
});
it('treats R1 as a no-op with only one supported layout',()=>{
 const input=createRadialInput(),b=buttons(),a=axes();input.sample(a,b,layout,false);
 b.bRightBumper=true;const result=input.sample(a,b,layout,false);
 expect(result.commands).toEqual([]);expect(result.selection).toEqual([1,1]);
 b.bRightBumper=false;input.sample(a,b,layout,false);b.bLeftStickClick=true;
 expect(input.sample(a,b,layout,false).commands[0].type).toBe('key');
});
it('clears a pending accent when a sent draft is externally replaced, retaining it for an unchanged draft',async()=>{
 const {syncRadialDraft}=await import('../../../src/menu/keyboard/radialInput');
 const held:KeyDef={char:'´',kind:'char',dead:{next:'a',combined:'á'}};
 const state={text:'hi',shift:'off' as const,held};
 expect(syncRadialDraft(state,'hi').held).toBe(held);
 const next=syncRadialDraft(state,'');expect(next.held).toBeNull();
 expect(applyRadialCommand(next,{type:'key',key:{char:'a',kind:'char'},uppercase:false}).text).toBe('a');
});
