import { appDetailsClasses, appDetailsHeaderClasses, findClassModule, playSectionClasses } from '@decky/ui';
import { LOG_PREFIX } from '../constants';
import { buildThemeCss, ClassMap, ThemeClasses } from './themeCss';

let classes: ThemeClasses | null = null;

function safeFind(filter: (m: Record<string, string>) => boolean): ClassMap {
    try {
        return (findClassModule(filter) || undefined) as ClassMap;
    } catch (error) {
        console.warn(`${LOG_PREFIX} class module lookup failed`, error);
        return undefined;
    }
}

/** Steam's class maps, looked up once by stable module keys (resolved live on 2026-10-02). */
function themeClasses(): ThemeClasses {
    if (!classes) {
        classes = {
            header: appDetailsHeaderClasses as unknown as ClassMap,
            details: appDetailsClasses as unknown as ClassMap,
            play: playSectionClasses as unknown as ClassMap,
            root: safeFind((m) => Boolean(m.AppDetailsRoot && m.PlaySection && m.AppDetailsContainer)),
            overview: safeFind((m) => Boolean(m.Backdrop && m.BackdropGlass)),
        };
    }
    return classes;
}

export function themeCss(): string {
    return buildThemeCss(themeClasses());
}
