export interface UnavailableMessage {
    text: string;
    icons: Array<{ src: string; alt: string }>;
}

/** Steam's own localized blocking explanation; reading hidden DOM keeps it independent of our page layout. */
export function readUnavailableMessage(doc: Pick<Document, 'querySelector'>, selector: string | null): UnavailableMessage | null {
    if (!selector) return null;
    const source = doc.querySelector(selector);
    const text = source?.textContent?.trim();
    if (!source || !text) return null;
    const icons = [...source.querySelectorAll('img')].flatMap((img) => {
        const src = img.getAttribute('src');
        return src ? [{ src, alt: img.getAttribute('alt') ?? '' }] : [];
    });
    return { text, icons };
}
