export interface ChatScrollAnchor { id?: string; offset: number; height: number; top: number }

/** Anchor to a message, not total height: a bounded page can prepend and trim equal amounts. */
export function captureChatAnchor(container: HTMLElement): ChatScrollAnchor {
    const bounds = container.getBoundingClientRect();
    const message = Array.from(container.querySelectorAll<HTMLElement>('[data-gg-message]')).find(element => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > bounds.top && rect.top < bounds.bottom;
    });
    return { id: message?.dataset.ggMessage, offset: message ? message.getBoundingClientRect().top - bounds.top : 0, height: container.scrollHeight, top: container.scrollTop };
}

export function restoreChatAnchor(container: HTMLElement, anchor: ChatScrollAnchor): void {
    const message = anchor.id ? Array.from(container.querySelectorAll<HTMLElement>('[data-gg-message]')).find(element => element.dataset.ggMessage === anchor.id) : undefined;
    container.scrollTop = message ? container.scrollTop + message.getBoundingClientRect().top - container.getBoundingClientRect().top - anchor.offset : anchor.top + container.scrollHeight - anchor.height;
}
