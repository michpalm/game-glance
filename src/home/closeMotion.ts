import type { GameInfoSlots } from '../logic/infoSlots';
import { measureMorph, type MorphMeasure } from './openHome';
import { openMotion, type MotionVar } from './openMotion';
import type { PageLook } from './openTargets';

/**
 * The way back's glide on Home (spec docs/superpowers/specs/2026-11-12-page-return-glide-design.md): the open's own
 * maths (measureMorph, openMotion) gives the page's places, and Home starts there (`data-gh-closing="from"`, homeCss
 * closingRules) to glide to rest. Only the shared parts' variables are used.
 */

export const CLOSING_ATTR = 'data-gh-closing';

const KEEP = /^--gho-(title|eyebrow|store|play-(bg|fg|icon|label|arrow|inset-x|inset-y|home-w|home-h|size|size-arrow)|circle-\d|circle-icon-\d)$/;

/** openMotion's variables the glide uses: the title, eyebrow, pills, Play (not its ring or settle layer) and the round buttons. */
export function closingVars(vars: MotionVar[]): MotionVar[] {
    return vars.filter((v) => KEEP.test(v.name));
}

type Measure = (root: HTMLElement, look: PageLook, extras: string, slots: GameInfoSlots) => Pick<MorphMeasure, 'home' | 'page' | 'scale' | 'focused'> | null;

/** Sets the glide's variables and `data-gh-closing="from"`; returns the undo, or null when Home cannot be measured. */
export function applyClosing(root: HTMLElement, look: PageLook, slots: GameInfoSlots, measure: Measure = measureMorph): (() => void) | null {
    let vars: MotionVar[];
    try {
        const m = measure(root, look, '', slots);
        if (!m) return null;
        vars = closingVars(openMotion(m.home, m.page, look, m.scale, m.focused));
    } catch {
        return null;
    }
    // Ends at 'done', not removed: while Home is still "just back" (gh-back), removing it would let the way back's fade
    // (homeCss gh-return-in) match again and replay from transparent over the parts that glided (a flash, on the Ally).
    // Home removes 'done' when its gh-back state ends (SpotlightHome).
    // 'cut' first (homeCss: no transition on any gliding part), styled, so an early end is at rest at once: without it the
    // round buttons' own transform transition kept them gliding, and an open measured them mid-flight (final review).
    const undo = () => {
        root.setAttribute(CLOSING_ATTR, 'cut');
        try {
            root.getBoundingClientRect?.();
        } catch {
            // the parts then finish their glide; the next state still applies
        }
        root.setAttribute(CLOSING_ATTR, 'done');
        for (const v of vars) root.style.removeProperty(v.name);
    };
    try {
        for (const v of vars) root.style.setProperty(v.name, v.value);
        root.setAttribute(CLOSING_ATTR, 'from');
        // The start frame must be styled before 'to' (as applyOpening): reading a box makes the browser style it now.
        root.getBoundingClientRect?.();
        return undo;
    } catch {
        root.removeAttribute(CLOSING_ATTR);
        for (const v of vars) root.style.removeProperty(v.name);
        return null;
    }
}
