import { ToggleField } from '@decky/ui';
import type { ReactNode } from 'react';
import { LuChevronRight } from 'react-icons/lu';
import { SettingSegments } from './SettingSegments';

/** "Parent › Title" heading of a Plugins view, with an optional item at the right. */
export function Crumb({ parent, title, aside }: { parent: string; title: string; aside?: ReactNode }) {
    return <div className="gg-menu-heading gg-plugin-crumb">
        <div className="gg-plugin-crumb-path"><span>{parent}</span><LuChevronRight aria-hidden="true" /><h2>{title}</h2></div>
        {aside}
    </div>;
}

/** A Game Glance switch in the menu's setting row, as Quick settings draws Steam's. */
export function ToggleRow({ id, label, description, checked, disabled = false, onChange }: {
    id: string; label: string; description?: string; checked: boolean; disabled?: boolean; onChange(value: boolean): void;
}) {
    return <div className={`gg-menu-setting gg-menu-setting-toggle${disabled ? ' gg-menu-setting-disabled' : ''}`} data-gg-focus={id}>
        <ToggleField highlightOnFocus={false} label={label} description={description} checked={checked} disabled={disabled} onChange={onChange} />
    </div>;
}

/** Two or three choices as segments under their label, as Performance draws Steam's. */
export function SegmentRow<T extends string>({ id, label, description, options, labels, value, onSelect }: {
    id: string; label: string; description?: string; options: readonly T[]; labels: Record<T, string>; value: T; onSelect(value: T): void;
}) {
    return <div className="gg-menu-setting gg-menu-setting-segments" data-gg-focus={id}>
        <div className="gg-menu-setting-header">{label}</div>
        <SettingSegments id={id} label={label} options={options} value={value} labels={labels} onSelect={choice => onSelect(choice as T)} />
        {description && <p className="gg-plugin-note">{description}</p>}
    </div>;
}
