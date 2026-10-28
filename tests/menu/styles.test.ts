import { describe, expect, it } from 'vitest';
import { menuStyles } from '../../src/menu/styles';
import { socialStyles } from '../../src/menu/socialStyles';
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
    it('raises the menu’s grey labels to 90% with the text shadow, leaving Home’s grey alone', ()=>{
        // Measured over frosted Ori on the Ally (2026-10-28): 62% labels fell to 2.3-4.8:1;
        // with the calmer frost, 90% keeps them above 5:1 even over a bright scene.
        expect(TOKENS.label).toBe('rgba(255,255,255,.90)');
        expect(rule('.gg-menu')).toContain(`--gg-text-dim:${TOKENS.label}`);
        expect(tokenCss('.x')).toContain(`--gg-text-dim:${TOKENS.dim}`);
        const dimRules=[...menuStyles.split('\n'),...socialStyles.split('\n')].flatMap(line=>line.match(/[^{}]+\{[^}]*color:var\(--gg-text-dim\)[^}]*\}/g)??[]);
        expect(dimRules.length).toBeGreaterThan(10);
        for(const css of dimRules) expect(css, css.slice(0,80)).toContain('text-shadow:var(--gg-text-shadow)');
    });
    it('fades the menu and status pills in over the fast motion token, linear like the frost shader',()=>{
        expect(rule('.gg-menu')).toMatch(/transition:[^;}]*opacity var\(--gg-fast\) linear/);
        expect(rule('.gg-menu-status-host')).toContain('transition:opacity var(--gg-fast) linear');
    });
});
