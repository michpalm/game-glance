import {expect,it} from 'vitest';
import {discoverControllerFeeds,validControllerSnapshot} from '../../../src/menu/keyboard/controllerFeed';
it('discovers both hooks by source without calling either during discovery',()=>{
 function first(){throw Error('useControllerAxesFeed must only run in React');}
 function second(){throw Error('useControllerButtonFeed must only run in React');}
 expect(discoverControllerFeeds(p=>[first,second].find(p))).toEqual({useAxes:first,useButtons:second});
 expect(discoverControllerFeeds(()=>first)).toBeNull();
 expect(discoverControllerFeeds(()=>{throw Error('missing')})).toBeNull();
});
it('rejects mismatched indices and malformed data before sampling',()=>{
 expect(validControllerSnapshot({nControllerIndex:0,LeftJoystick:{x:0,y:0},RightJoystick:{x:NaN,y:0}},{nControllerIndex:1})).toBe(false);
});
it('normalizes Steam released-button fields from undefined to false while preserving pressed buttons',async()=>{
 const {normalizeControllerSnapshot}=await import('../../../src/menu/keyboard/controllerFeed');
 const axes={nControllerIndex:0,LeftJoystick:{x:0,y:-.0000305185},RightJoystick:{x:0,y:-.0000305185}};
 // Steam's raw notification handler explicitly creates these keys even when the protobuf value is absent.
 const buttons={nControllerIndex:0,bLeftStickClick:undefined,bRightStickClick:undefined,bLeftTrigger:undefined,bRightTrigger:undefined,bLeftBumper:undefined,bRightBumper:undefined,bButtonNorth:undefined,bButtonEast:undefined,bButtonSouth:true,bButtonWest:undefined};
 expect(validControllerSnapshot(axes,buttons)).toBe(true);
 const result=normalizeControllerSnapshot(axes,buttons,0)!;
 expect(result.buttons.bButtonSouth).toBe(true);expect(result.buttons.bLeftStickClick).toBe(false);expect(result.buttons.bLeftTrigger).toBe(false);
 expect(normalizeControllerSnapshot(axes,{...buttons,bButtonEast:'pressed'},0)).toBeNull();
 expect(normalizeControllerSnapshot(axes,buttons,1)).toBeNull();
 expect(normalizeControllerSnapshot(axes,{nControllerIndex:0},0)).toBeNull();
});
