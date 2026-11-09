import type { Stop } from '../model';

/** Popup keyboards and the native footer live in different documents. Hide paint/input while retaining layout. */
export function hideKeyboardNavigation(document: Document): Stop {
    const owner = (globalThis as unknown as { SteamUIStore?: { WindowStore?: { GamepadUIMainWindowInstance?: { BrowserWindow?: { document?: Document } } } } }).SteamUIStore?.WindowStore?.GamepadUIMainWindowInstance?.BrowserWindow?.document;
    const documents = new Set([document, ...(owner ? [owner] : [])]);
    const sheets: HTMLStyleElement[] = [];
    try {
        for (const doc of documents) {
            const sheet = doc.createElement('style');
            sheet.dataset.ggKeyboardNavigation = 'true';
            sheet.textContent = '#Footer,#Footer *{visibility:hidden!important;pointer-events:none!important}';
            doc.head.appendChild(sheet);
            sheets.push(sheet);
        }
    } catch (error) {
        sheets.forEach(sheet => sheet.remove());
        throw error;
    }
    // Each keyboard owns only its styles, so overlapping opens cannot reveal one another's footer.
    return () => sheets.forEach(sheet => sheet.remove());
}
