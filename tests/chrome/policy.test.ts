import {describe,expect,it} from 'vitest';
import {chromeLaunching,chromeMode,chromeReturn,chromeStatusHidden} from '../../src/chrome/policy';
import type {ChromeClaim} from '../../src/chrome/claims';

const home:ChromeClaim={page:'home',statusHidden:false,launching:false};

describe('chromeMode',()=>{
    it('is off unless opted in',()=>{
        expect(chromeMode({optedIn:false,everyPage:true,claims:[],suspended:false})).toBe('off');
    });
    it('needs a claim when not on every page',()=>{
        expect(chromeMode({optedIn:true,everyPage:false,claims:[],suspended:false})).toBe('off');
        expect(chromeMode({optedIn:true,everyPage:false,claims:[home],suspended:false})).toBe('active');
    });
    it('is active on every page without claims, suspended when asked',()=>{
        expect(chromeMode({optedIn:true,everyPage:true,claims:[],suspended:false})).toBe('active');
        expect(chromeMode({optedIn:true,everyPage:true,claims:[],suspended:true})).toBe('suspended');
    });
});
describe('claim readers',()=>{
    const back=()=>{};
    it('combines launching and hidden flags',()=>{
        expect(chromeLaunching([home])).toBe(false);
        expect(chromeLaunching([home,{...home,page:'game',launching:true}])).toBe(true);
        expect(chromeStatusHidden([home])).toBe(false);
        expect(chromeStatusHidden([home,{...home,page:'game',statusHidden:true}])).toBe(true);
    });
    it('returns Home\'s returnHome only',()=>{
        expect(chromeReturn([])).toBeUndefined();
        expect(chromeReturn([{...home,page:'game',returnHome:()=>{}}])).toBeUndefined();
        expect(chromeReturn([{...home,returnHome:back}])).toBe(back);
    });
});
