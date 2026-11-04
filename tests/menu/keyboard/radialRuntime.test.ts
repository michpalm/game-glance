import {expect,it} from 'vitest';
import {startRadialRuntime} from '../../../src/menu/keyboard/radialRuntime';
import {buildRadialLayout} from '../../../src/menu/keyboard/radialLayout';
import {BUILTIN_QWERTY} from '../../../src/menu/keyboard/layouts';
const b=()=>({nControllerIndex:0,bLeftStickClick:false,bRightStickClick:false,bLeftTrigger:false,bRightTrigger:false,bLeftBumper:false,bRightBumper:false,bButtonNorth:false,bButtonEast:false,bButtonSouth:false,bButtonWest:false});
it('gates input, baselines after interruption, swallows routing and releases its lease',()=>{
 let frame:FrameRequestCallback|undefined,owned=true,changes=0;const commands:string[]=[],doc=new EventTarget();
 const buttons=b(),axes={nControllerIndex:0,LeftJoystick:{x:0,y:1},RightJoystick:{x:0,y:0}};
 const view={requestAnimationFrame:(fn:FrameRequestCallback)=>{frame=fn;return 1;},cancelAnimationFrame:()=>{frame=undefined;}} as unknown as Window;
 const stop=startRadialRuntime({view,document:doc as Document,read:()=>({axes,buttons}),layout:()=>buildRadialLayout(BUILTIN_QWERTY),ownsInput:()=>owned,changed:()=>{changes++;},command:c=>commands.push(c.type),failed:()=>{throw Error('unexpected')}});
 const tick=()=>{const fn=frame;frame=undefined;fn?.(0);};tick();tick();expect(changes).toBe(1);
 const event=new Event('vgp_oncancel',{cancelable:true});doc.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);
 owned=false;buttons.bButtonSouth=true;tick();owned=true;tick();expect(commands).toEqual([]);
 buttons.bButtonSouth=false;tick();buttons.bButtonSouth=true;tick();expect(commands).toEqual(['send']);
 stop();expect(frame).toBeUndefined();const after=new Event('vgp_oncancel',{cancelable:true});doc.dispatchEvent(after);expect(after.defaultPrevented).toBe(false);
});
it('consumes both stick-click routing events while leaving Select, Start and system buttons alone',()=>{
 const doc=new EventTarget(),view={requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}} as unknown as Window;
 const stop=startRadialRuntime({document:doc as Document,view,read:()=>null,layout:()=>buildRadialLayout(BUILTIN_QWERTY),ownsInput:()=>true,changed:()=>{},command:()=>{},failed:()=>{}});
 for(const [button,want] of [[15,true],[16,true],[13,false],[14,false],[27,false],[28,false]] as const){
  const event=new Event('vgp_onbuttondown',{cancelable:true});Object.defineProperty(event,'detail',{value:{button}});doc.dispatchEvent(event);expect(event.defaultPrevented,`button ${button}`).toBe(want);
 }
 stop();
});
// Steam also sends D-pad presses for a pushed stick (all with source 1, read on the Ally 2026-11-04), so a press waits a moment and is
// dropped if either stick was pushed around it; the controller readings can lag the event by a frame or two.
function dpadRig(){
 let frame:FrameRequestCallback|undefined,owned=true,now=0;const moves:string[]=[],doc=new EventTarget();
 const axes={nControllerIndex:0,LeftJoystick:{x:0,y:0},RightJoystick:{x:0,y:0}},buttons=b();
 const view={requestAnimationFrame:(fn:FrameRequestCallback)=>{frame=fn;return 1;},cancelAnimationFrame:()=>{frame=undefined;}} as unknown as Window;
 const stop=startRadialRuntime({document:doc as Document,view,now:()=>now,read:()=>({axes,buttons}),layout:()=>buildRadialLayout(BUILTIN_QWERTY),ownsInput:()=>owned,direction:m=>moves.push(m),changed:()=>{},command:()=>{},failed:()=>{throw Error('unexpected')}});
 const press=(button:number)=>{const event=new Event('vgp_onbuttondown',{cancelable:true});Object.defineProperty(event,'detail',{value:{button}});doc.dispatchEvent(event);return event;};
 const wait=(ms:number)=>{for(let t=0;t<ms;t+=16){now+=16;const fn=frame;frame=undefined;fn?.(now);}};
 return {moves,axes,press,wait,stop,own:(v:boolean)=>{owned=v;}};
}
it('turns the D-pad into cursor moves only while it owns input, and still swallows those presses',()=>{
 const r=dpadRig();r.wait(300);
 for(const button of [11,12,9,10]){expect(r.press(button).defaultPrevented).toBe(true);r.wait(100);}
 expect(r.moves).toEqual(['left','right','start','end']);
 r.own(false);r.press(11);r.wait(100);expect(r.moves).toEqual(['left','right','start','end']);
 r.stop();
});
it('ignores the D-pad presses Steam makes from a pushed stick',()=>{
 const r=dpadRig();r.wait(300);
 r.axes.LeftJoystick.x=-0.9;r.wait(32);expect(r.press(11).defaultPrevented).toBe(true);r.wait(100);
 r.axes.LeftJoystick.x=0;r.axes.RightJoystick.y=0.8;r.wait(32);r.press(9);r.wait(100);
 expect(r.moves).toEqual([]);
 r.axes.RightJoystick.y=0;r.wait(300);r.press(12);r.wait(100);expect(r.moves).toEqual(['right']);
 r.stop();
});
it('also when the stick shows up in the readings only after the press (they lag)',()=>{
 const r=dpadRig();r.wait(300);
 r.press(11);r.wait(16);r.axes.LeftJoystick.x=-0.9;r.wait(100);expect(r.moves).toEqual([]);
 r.stop();
});
