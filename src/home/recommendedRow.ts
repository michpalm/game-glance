/** What the Recommended tab's first row shows (docs/superpowers/specs/2026-11-18-personal-calendar-row-design.md). Pure. */
export type RecommendedRow = 'playNext' | 'calendar';
export const RECOMMENDED_ROWS: readonly RecommendedRow[] = ['playNext', 'calendar'];
export const RECOMMENDED_ROW_LABELS: Record<RecommendedRow, string> = { playNext: 'Play next', calendar: 'Personal calendar' };
export const RECOMMENDED_ROW_COPY: Record<RecommendedRow, string> = {
    playNext: 'Installed games you have not finished yet.',
    calendar: "New and upcoming games picked for you by Steam, day by day.",
};
export function recommendedRowOf(value: unknown): RecommendedRow {
    return value === 'calendar' ? 'calendar' : 'playNext';
}
