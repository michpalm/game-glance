import { Focusable, NavEntryPositionPreferences, ToggleField } from '@decky/ui';
import { useState } from 'react';
import { PINNABLE, type MenuEvent, type MenuState } from '../model';
import type { createMenuPreferences } from '../preferences';
import type { NativeRequest } from '../steam/runtime';
import { MenuAction } from './MenuAction';
import { SECTION_LABELS } from './MenuBar';
export function MorePanel({ state, preferences, handoff, dispatch }: { state: MenuState; preferences: ReturnType<typeof createMenuPreferences>; handoff(request: NativeRequest): void; dispatch(event: MenuEvent): void }) {
    const [error, setError] = useState('');
    const configure = state.stack[state.stack.length - 1] === 'configure-menu';
    if (configure) return <Focusable className="gg-menu-more" flow-children="column">
        <MenuAction id="configure:back" className="gg-menu-back" onAction={() => dispatch({ type: 'back' })}>← More</MenuAction>
        <div className="gg-menu-heading"><h2>Configure menu</h2><span>{state.pins.length} / 4 on the bar</span></div>
        <p>Choose 1–4 menus. Other menus stay in More; a running game gets its own space.</p>
        <Focusable className="gg-menu-switches" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{PINNABLE.map(section => {
            const checked = state.pins.includes(section);
            return <div key={section} className="gg-menu-setting gg-menu-setting-toggle" data-gg-focus={`configure:${section}`}><ToggleField highlightOnFocus={false} label={SECTION_LABELS[section]} checked={checked} disabled={checked ? state.pins.length === 1 : state.pins.length === 4} onChange={value => {
                const pins = value ? [...state.pins, section] : state.pins.filter(id => id !== section);
                void preferences.setPins(pins).then(() => setError(''), () => setError('Could not save menu choices. Try again.'));
            }} /></div>;
        })}</Focusable>
        {error && <p role="alert">{error}</p>}
    </Focusable>;
    return <Focusable className="gg-menu-more" flow-children="column"><h2>More</h2>
        <Focusable className="gg-menu-grid" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{PINNABLE.filter(section => !state.pins.includes(section)).map(section => <MenuAction key={section} id={`more:${section}`} onAction={() => dispatch({ type: 'select', section })}>{SECTION_LABELS[section]}</MenuAction>)}</Focusable>
        <Focusable className="gg-menu-secondary" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}><MenuAction id="more:configure" onAction={() => dispatch({ type: 'push', viewId: 'configure-menu' })}>Configure menu</MenuAction><MenuAction id="more:native" onAction={() => handoff({ kind: 'main-menu' })}>Open Steam menu</MenuAction></Focusable>
    </Focusable>;
}
