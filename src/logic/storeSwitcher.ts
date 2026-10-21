type Fiber = { memoizedProps?: { appId?: number; siblings?: unknown[] }; return?: Fiber | null };

/** Recognise Unifideck's game-version dropdown by its owning component's game and siblings, never screen position. */
export function findStoreSwitcher(doc: Document, appId: number): HTMLElement | null {
    for (const button of doc.querySelectorAll<HTMLElement>('[role="combobox"]')) {
        const key = Object.keys(button).find((name) => name.startsWith('__reactFiber'));
        let fiber = key ? (button as unknown as Record<string, Fiber>)[key] : undefined;
        for (let depth = 0; fiber && depth < 24; depth++, fiber = fiber.return ?? undefined) {
            const props = fiber.memoizedProps;
            if (typeof props?.appId === 'number' && (props.appId >>> 0) === (appId >>> 0) && Array.isArray(props.siblings) && props.siblings.length > 1) return button;
        }
    }
    return null;
}

/** Keep the native dropdown and its selection handler, with the menu anchored to the visible Store pill. */
export function openStoreSwitcher(button: HTMLElement, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>): void {
    const wrapper = button.parentElement;
    if (!button.isConnected || !wrapper) return;
    Object.assign(wrapper.style, { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    button.click();
}
