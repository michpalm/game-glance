import {describe,it,expect} from 'vitest';
import {nextHomeControl,repairHomeControl,orderHomeControls} from '../../src/home/homeControls';
describe('expanded Home status policy',()=>{
 it('orders dynamic cells by presentation and removes duplicate IDs',()=>{expect(orderHomeControls(['clock','controller:1','battery','download','connection','controller:0','controllers-more','profile','clock'])).toEqual(['download','connection','controller:0','controller:1','controllers-more','battery','clock','profile']);});
 it('clamps navigation and repairs removal to the closest surviving slot',()=>{const ids=['connection','battery','clock'] as const;expect(nextHomeControl('connection','left',ids)).toBe('connection');expect(nextHomeControl('battery','right',ids)).toBe('clock');expect(nextHomeControl('clock','right',ids)).toBe('clock');expect(nextHomeControl('clock','left',[])).toBeNull();expect(repairHomeControl('battery',ids,['connection','clock'])).toBe('clock');expect(repairHomeControl('clock',ids,['download','clock'])).toBe('clock');expect(repairHomeControl('clock',ids,[])).toBeNull();});
});
