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
