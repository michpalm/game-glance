import { describe, expect, it } from 'vitest';
import { menuStyles } from '../../src/menu/styles';
import { TOKENS, tokenCss } from '../../src/styles/tokens';
const rule=(selector:string)=>menuStyles.split('\n').find(line=>line.startsWith(selector+'{'))??'';
describe('menu glass and reveal motion',()=>{
    it('draws the bar and panel in the visual language glass over the frosted game',()=>{
        expect(rule('.gg-menu .gg-menu-bar,.gg-menu .gg-menu-panel')).toContain(`background:${TOKENS.glass}`);
    });
    it('gives the notification bell, the third frost region, the same glass and edge', ()=>{
        const bell=rule('.gg-menu-native-host .gg-menu button.gg-menu-action.gg-menu-notifications.DialogButton');
        expect(bell).toContain(`background:${TOKENS.glass}`);
        expect(bell).toContain('border-color:var(--gg-edge)');
    });
    it('lifts unselected tabs and Performance categories to the idle-tab white, leaving other dim text alone', ()=>{
        expect(TOKENS.idle).toBe('rgba(255,255,255,.80)');
        expect(tokenCss('.x')).toContain(`--gg-text-idle:${TOKENS.idle}`);
        for (const selector of ['.gg-menu-native-host .gg-menu button.gg-menu-tab.DialogButton', '.gg-menu-native-host .gg-menu .gg-menu-perf-tabs button.gg-menu-action.DialogButton'])
            expect(rule(selector)).toContain('color:var(--gg-text-idle)');
        expect(rule('.gg-menu p')).toContain('color:var(--gg-text-dim)');
    });
    it('fades the menu and status pills in over the fast motion token, linear like the frost shader',()=>{
        expect(rule('.gg-menu')).toMatch(/transition:[^;}]*opacity var\(--gg-fast\) linear/);
        expect(rule('.gg-menu-status-host')).toContain('transition:opacity var(--gg-fast) linear');
    });
});
