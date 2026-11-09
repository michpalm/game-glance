import { findModule } from '@decky/ui';
import type { ComponentType } from 'react';
import { memoLookup } from '../../home/moduleLookup';

type Icon = ComponentType<Record<string, unknown>>;
// Geometry observed in Steam's native Performance panel on the Ally. Export names
// are minified, so discover its icon module by artwork, never webpack module IDs.
const MARKERS = {
    performance: 'M17.9999 33.0001C26.2841',
    disableLimit: 'matrix(1 0 0 -1 17.6758 29)',
    vrr: 'matrix(1 0 0 -1 30.6582 31)',
    tearing: 'M30.129 15.954H27.2883',
    halfRate: 'matrix(1 0 0 -1 9.70898 31.5952)',
    tdp: 'M29.2499 6.75H6.75098',
    gpuClock: 'M32.204 25.7727L29.7196',
} as const;
type IconId = keyof typeof MARKERS;
const source = (value: unknown): string => typeof value === 'function' ? Function.prototype.toString.call(value) : '';
const matches = (value: unknown, marker: string): boolean => {
    const text = source(value);
    return text.length < 20_000 && text.includes('svg') && text.includes(marker);
};
const icons = memoLookup<Partial<Record<IconId, Icon>>>('Performance icons', () => {
    const module = findModule((value: unknown) => !!value && typeof value === 'object' &&
        Object.values(value).some(icon => matches(icon, MARKERS.performance)));
    if (!module) return null;
    const exports = Object.values(module);
    return Object.fromEntries(Object.entries(MARKERS).flatMap(([id, marker]) => {
        const icon = exports.find(value => matches(value, marker));
        return icon ? [[id, icon as Icon]] : [];
    }));
});
/** Missing artwork stays absent; text labels and native setting controls remain usable. */
export function steamPerformanceIcon(id: string): Icon | undefined {
    const key = id === 'tdpEnabled' ? 'tdp' : id === 'gpuClockEnabled' ? 'gpuClock' : id;
    return icons()?.[key as IconId];
}
