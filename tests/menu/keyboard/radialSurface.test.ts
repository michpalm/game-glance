import {parseHTML} from 'linkedom';
import {expect,it} from 'vitest';
import {installRadialSurface} from '../../../src/menu/keyboard/radialSurface';
import {installOutsideMenuClick} from '../../../src/menu/navigation';
import {createKeyboardSession} from '../../../src/menu/keyboard/session';
it('treats both body portals as inside and first outside tap closes only the keyboard',()=>{
 const {document,window}=parseHTML('<html><body><div class="gg-menu"><button id="field"></button></div><div class="gg-radial-keyboard-host"><button id="left"></button><button id="right"></button></div><button id="outside"></button></body></html>');
 const root=document.querySelector('.gg-menu')!,field=document.getElementById('field')!,portal=document.querySelector('.gg-radial-keyboard-host')!;
 // linkedom omits Window capture from the propagation path; model that browser boundary explicitly.
 const listeners=new Map<string,Set<(e:Event)=>void>>();
 const view={addEventListener:(t:string,f:(e:Event)=>void)=>{if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t)!.add(f);},removeEventListener:(t:string,f:(e:Event)=>void)=>listeners.get(t)?.delete(f)} as unknown as Window;
 const click=(id:string)=>{const target=document.getElementById(id)!,event=new window.Event('click',{bubbles:true,cancelable:true});let stopped=false;const stop=event.stopImmediatePropagation.bind(event);event.stopImmediatePropagation=()=>{stopped=true;stop();};Object.defineProperty(event,'target',{value:target,configurable:true});for(const fn of listeners.get('click')??[]){fn(event as unknown as Event);if(stopped)return;}target.dispatchEvent(event);};
 let keyboard=0,menu=0;const stopMenu=installOutsideMenuClick(root as any,()=>menu++,()=>true);
 const stop=installRadialSurface(field as any,()=>[portal as any],()=>keyboard++,()=>{},view);
 click('left');click('right');expect([keyboard,menu]).toEqual([0,0]);
 click('outside');expect([keyboard,menu]).toEqual([1,0]);
 stop();stopMenu();
});
it('clears explicit radial ownership when the session closes',()=>{
 const s=createKeyboardSession();s.open();s.setMode('radial');expect(s.mode()).toBe('radial');s.close();expect(s.mode()).toBeNull();
});
