import { Focusable } from '@decky/ui';
import type { PerformanceValue } from '../steam/performance';
import { MenuAction } from './MenuAction';

/** Native option values are retained; selection is always authoritative readback, separate from focus. */
export function SettingSegments({ id, label, options, value, labels, disabled = false, onSelect }: {
    id: string; label: string; options: readonly PerformanceValue[]; value: PerformanceValue | null;
    labels: Record<string, string>; disabled?: boolean; onSelect(value: PerformanceValue): void;
}) {
    return <Focusable className="gg-menu-segmented" flow-children="row" role="group" aria-label={label}>
        {options.map(option => <MenuAction key={String(option)} id={`${id}:${option}`} selected={option === value} disabled={disabled}
            onAction={() => { if (!disabled) onSelect(option); }}>{labels[String(option)] ?? String(option)}</MenuAction>)}
    </Focusable>;
}
