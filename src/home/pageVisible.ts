/** True while the page's window is hidden (document.visibilityState), so Home's polls can skip their reads. False when unknown. */
export function pageHidden(): boolean {
    try {
        return typeof document !== 'undefined' && document.visibilityState === 'hidden';
    } catch {
        return false;
    }
}
