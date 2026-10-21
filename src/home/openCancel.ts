/** B cancels a pending Home open before a zone handler or Steam's router can also act on it. */
export function listenOpenCancel(doc: EventTarget, cancel: () => void): () => void {
    const onCancel = (event: Event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancel();
    };
    doc.addEventListener('vgp_oncancel', onCancel, { capture: true });
    return () => doc.removeEventListener('vgp_oncancel', onCancel, { capture: true });
}
