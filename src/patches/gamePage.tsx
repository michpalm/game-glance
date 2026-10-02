import { routerHook } from '@decky/api';
import { afterPatch, appDetailsClasses, createReactTreePatcher, findInReactTree } from '@decky/ui';
import { ReactElement } from 'react';
import { GameHero } from '../components/GameHero';
import { LOG_PREFIX } from '../constants';
import { insertHero, InsertResult } from './insertHero';

const ROUTE = '/library/app/:appid';
const KEY = 'game-glance';
const warned = new Set<InsertResult>();

function warnOnce(result: InsertResult) {
    if (result === 'inserted' || result === 'present' || warned.has(result)) return;
    warned.add(result);
    console.warn(`${LOG_PREFIX} could not insert cards (${result}); leaving page unchanged`);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Adapted from HLTB for Deck's src/patches/LibraryApp.tsx (MIT). Every step is guarded so a
// Steam update can only make the patch do nothing, never break Steam's game page.
export function patchGamePage(): () => void {
    const patch = routerHook.addPatch(ROUTE, (routerTree: any) => {
        try {
            const routeProps = findInReactTree(routerTree, (x: any) => x?.renderFunc);
            if (!routeProps) return routerTree;

            let overview: unknown;
            let details: unknown;
            const handler = createReactTreePatcher(
                [
                    (tree: any) => {
                        try {
                            const children = findInReactTree(tree, (x: any) => x?.props?.children?.props?.overview)?.props?.children;
                            if (!children) return null;
                            overview = children.props.overview;
                            details = children.props.details;
                            return children;
                        } catch {
                            return null;
                        }
                    },
                ],
                (_: Record<string, unknown>[], ret: ReactElement) => {
                    const element = <GameHero key={KEY} overview={overview} details={details} />;
                    warnOnce(insertHero(ret, appDetailsClasses?.InnerContainer, element, findInReactTree));
                    return ret;
                },
            );
            afterPatch(routeProps, 'renderFunc', handler);
        } catch (error) {
            console.warn(`${LOG_PREFIX} route patch failed; leaving page unchanged`, error);
        }
        return routerTree;
    });
    return () => routerHook.removePatch(ROUTE, patch);
}
