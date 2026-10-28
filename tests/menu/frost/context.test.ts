import { describe, expect, it } from 'vitest';
import { menuOverHome, readFrostContext } from '../../../src/menu/frost/context';
function owner(overlay=false,scaler=3,hdr:unknown=false) {
    return {innerWidth:1920,innerHeight:1080,devicePixelRatio:1,SystemPerfStore:{msgSettingsPerApp:{split_scaling_scaler:scaler},msgSettingsGlobal:{is_hdr_enabled:hdr}},SteamUIStore:{WindowStore:{GamepadUIMainWindowInstance:{BIsOverlayPath:()=>overlay}}}} as unknown as Window;
}
describe('frost context',()=>{
    it('reads the verified native fit/fill/stretch enum without mutating settings',()=>{
        for(const [value,fit] of [[3,'fit'],[4,'fill'],[5,'stretch']] as const)
            expect(readFrostContext(owner(true,value),'v1')).toMatchObject({background:'game',fit,outputWidth:1920,colorMode:'sdr'});
    });
    it('tells Home from a game only when Steam answers',()=>{
        expect(menuOverHome(owner(false))).toBe(true);
        expect(menuOverHome(owner(true))).toBe(false);
        // Unknown is not Home: the game behaviour (popup copy shown) stays the fallback.
        expect(menuOverHome({} as Window)).toBe(false);
    });
    it('recognizes Home and HDR independently',()=>{
        expect(readFrostContext(owner(false,3,true),'v1')).toMatchObject({background:'steam',colorMode:'hdr'});
    });
    it('rejects unknown game mapping, color and viewport',()=>{
        expect(readFrostContext(owner(true,1),'v1')).toBeNull();
        expect(readFrostContext(owner(true,3,undefined),'v1')).not.toBeNull();
        expect(readFrostContext(owner(true,3,null),'v1')).toBeNull();
        const o=owner(); Object.assign(o,{innerWidth:0}); expect(readFrostContext(o,'v1')).toBeNull();
    });
    it('uses verified compositor HDR and Auto cap when Steam omits those values',()=>{
        const o=owner(true,1,null);
        expect(readFrostContext(o,'v1',{hdr:false,maxScale:2})).toMatchObject({colorMode:'sdr',fit:'auto',maxScale:2});
        expect(readFrostContext(o,'v1',{hdr:false,maxScale:null})).toBeNull();
    });
});
