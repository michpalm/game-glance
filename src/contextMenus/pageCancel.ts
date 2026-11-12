/**
 * B on one of the panel's pages. Steam's MenuRoot runs its `onCancel` prop and then always hides the menu
 * (probed 2026-11-12), so a page catches B on its own rows and stops it there instead.
 */
export function backOnCancel(back: () => void) {
    return (evt?: Event) => {
        evt?.stopPropagation?.();
        evt?.preventDefault?.();
        back();
    };
}
