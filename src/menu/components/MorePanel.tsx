import { Focusable, NavEntryPositionPreferences, ToggleField } from '@decky/ui';
import { useState } from 'react';
import { PINNABLE, type MenuEvent, type MenuState, type PinnedSectionId } from '../model';
import type { createMenuPreferences } from '../preferences';
import type { NativeRequest } from '../steam/runtime';
import { MenuAction } from './MenuAction';
import { SECTION_ICONS, SECTION_LABELS } from './MenuBar';
import { Crumb } from './SettingRows';
export function MorePanel({ state, preferences, handoff, dispatch }: { state: MenuState; preferences: ReturnType<typeof createMenuPreferences>; handoff(request: NativeRequest): void; dispatch(event: MenuEvent): void }) {
    const [error, setError] = useState('');
    const configure = state.stack[state.stack.length - 1] === 'configure-menu';
    if (configure) return <ConfigureMenuView pins={state.pins} error={error}
        onChange={pins => { void preferences.setPins(pins).then(() => setError(''), () => setError('Could not save menu choices. Try again.')); }} />;
    return <Focusable className="gg-menu-more" flow-children="column"><h2>More</h2>
        <Focusable className="gg-menu-grid" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{PINNABLE.filter(section => !state.pins.includes(section)).map(section => <MenuAction key={section} id={`more:${section}`} onAction={() => dispatch({ type: 'select', section })}>{SECTION_LABELS[section]}</MenuAction>)}</Focusable>
        <Focusable className="gg-menu-secondary" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}><MenuAction id="more:configure" onAction={() => dispatch({ type: 'push', viewId: 'configure-menu' })}>Configure menu</MenuAction><MenuAction id="more:native" onAction={() => handoff({ kind: 'main-menu' })}>Open Steam menu</MenuAction></Focusable>
    </Focusable>;
}

/** Which menus sit on the bar (1–4), each with its tab icon; B returns to More. */
export function ConfigureMenuView({ pins, onChange, error }: { pins: readonly PinnedSectionId[]; onChange(pins: PinnedSectionId[]): void; error: string }) {
    return <Focusable className="gg-menu-more" flow-children="column">
        <Crumb parent="More" title="Configure menu" aside={<span>{`${pins.length} / 4 on the bar`}</span>} />
        <p className="gg-plugin-note">Choose 1–4 menus for the bar. The rest stay in More; a running game gets its own tab.</p>
        <Focusable className="gg-menu-switches gg-menu-configure" flow-children="grid" navEntryPreferPosition={NavEntryPositionPreferences.MAINTAIN_X}>{PINNABLE.map(section => {
            const checked = pins.includes(section);
            const Icon = SECTION_ICONS[section];
            const label = <span className="gg-menu-setting-label"><Icon aria-hidden="true" /><span>{SECTION_LABELS[section]}</span></span>;
            return <div key={section} className="gg-menu-setting gg-menu-setting-toggle" data-gg-focus={`configure:${section}`}><ToggleField highlightOnFocus={false} label={label} checked={checked} disabled={checked ? pins.length === 1 : pins.length === 4}
                onChange={value => onChange(value ? [...pins, section] : pins.filter(id => id !== section))} /></div>;
        })}</Focusable>
        {error && <p className="gg-menu-error" role="alert">{error}</p>}
    </Focusable>;
}
