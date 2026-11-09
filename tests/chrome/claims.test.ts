import {describe,expect,it,vi} from 'vitest';
import {createChromeClaims,type ChromeClaim} from '../../src/chrome/claims';

const home:ChromeClaim={page:'home',statusHidden:false,launching:false};

describe('createChromeClaims',()=>{
    it('claims, updates and releases, notifying on each change',()=>{
        const c=createChromeClaims(),seen=vi.fn();c.subscribe(seen);
        const h=c.claim(home);expect(c.get()).toEqual([home]);
        h.update({statusHidden:true});expect(c.get()[0].statusHidden).toBe(true);
        h.release();h.release();expect(c.get()).toEqual([]);expect(seen).toHaveBeenCalledTimes(3);
    });
    it('keeps the same array between changes and ignores updates after release',()=>{
        const c=createChromeClaims(),h=c.claim(home),first=c.get();
        expect(c.get()).toBe(first);
        h.release();const empty=c.get();h.update({launching:true});
        expect(c.get()).toBe(empty);expect(c.get()).toEqual([]);
    });
    it('stops notifying after unsubscribe',()=>{
        const c=createChromeClaims(),seen=vi.fn(),off=c.subscribe(seen);off();c.claim(home);
        expect(seen).not.toHaveBeenCalled();
    });
});
