const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function htmlToText(html: string): string {
    const withoutTags = html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '');
    const decoded = withoutTags.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
        if (code.startsWith('#')) {
            const isHex = code[1] === 'x' || code[1] === 'X';
            const n = isHex ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
            return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
        }
        return NAMED[code.toLowerCase()] ?? match;
    });
    return decoded.replace(/\s+/g, ' ').trim();
}
