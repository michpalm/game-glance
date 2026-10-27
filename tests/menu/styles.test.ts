import { describe, expect, it } from 'vitest';
import { menuStyles } from '../../src/menu/styles';
import { TOKENS } from '../../src/styles/tokens';
const rule=(selector:string)=>menuStyles.split('\n').find(line=>line.startsWith(selector+'{'))??'';
describe('menu glass and reveal motion',()=>{
    it('draws the bar and panel in the visual language glass over the frosted game',()=>{
        expect(rule('.gg-menu .gg-menu-bar,.gg-menu .gg-menu-panel')).toContain(`background:${TOKENS.glass}`);
    });
    it('fades the menu and status pills in over the fast motion token, linear like the frost shader',()=>{
        expect(rule('.gg-menu')).toMatch(/transition:[^;}]*opacity var\(--gg-fast\) linear/);
        expect(rule('.gg-menu-status-host')).toContain('transition:opacity var(--gg-fast) linear');
    });
});
