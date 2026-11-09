import { Focusable } from '@decky/ui';
import type { PerformanceValue } from '../steam/performance';
import { MenuAction } from './MenuAction';

/** Native option values are retained; the shown value may be a pressed option that Steam is still applying (`spinning`). */
export function SettingSegments({ id, label, options, value, labels, disabled = false, spinning = false, onSelect }: {
    id: string; label: string; options: readonly PerformanceValue[]; value: PerformanceValue | null;
    labels: Record<string, string>; disabled?: boolean; spinning?: boolean; onSelect(value: PerformanceValue): void;
}) {
    return <Focusable className="gg-menu-segmented" flow-children="row" role="group" aria-label={label}>
        {options.map(option => {
            const chosen = option === value;
            return <MenuAction key={String(option)} id={`${id}:${option}`} selected={chosen} disabled={disabled}
                className={chosen && spinning ? 'gg-menu-pending' : ''} busy={chosen && spinning ? true : undefined}
                onAction={() => { if (!disabled && !chosen) onSelect(option); }}>{labels[String(option)] ?? String(option)}</MenuAction>;
        })}
    </Focusable>;
}
