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
