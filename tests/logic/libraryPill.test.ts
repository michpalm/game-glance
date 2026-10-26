import { describe, expect, it, vi, afterEach } from 'vitest';
import { parseHTML } from 'linkedom';
import { subscribeLibraryUpdates, libraryPillState, openLibraryChoice } from '../../src/logic/libraryPill';

afterEach(() => vi.unstubAllGlobals());

describe('library selection pill', () => {
    it('hides for a sole owned copy, and keeps a borrowed-only pill static', () => {
        const { document } = parseHTML('<html><body></body></html>');
        expect(libraryPillState(document as unknown as Document, '.shared a', null)).toEqual({ label: null, link: null });
        expect(libraryPillState(document as unknown as Document, '.shared a', 'Family Sharing · Friend')).toEqual({ label: 'Family Sharing · Friend', link: null });
    });
    it('offers the native chooser even when the selected copy is your own', () => {
        vi.stubGlobal('friendStore', { m_FriendsUIFriendStore: { self: { display_name: 'Player' } } });
        const { document } = parseHTML('<div class="shared"><a role="button">Change preferred copy</a></div>');
        const link = document.querySelector('a') as unknown as HTMLElement;
        expect(libraryPillState(document as unknown as Document, '.shared a', null)).toEqual({ label: 'Family Sharing · Player', link });
        expect(libraryPillState(document as unknown as Document, '.shared a', 'Family Sharing · Friend')).toEqual({ label: 'Family Sharing · Friend', link });
        const click = vi.spyOn(link, 'click');
        openLibraryChoice(link);
        expect(click).toHaveBeenCalledOnce();
        link.remove();
        openLibraryChoice(link);
        expect(click).toHaveBeenCalledOnce();
    });
    it('does not offer a disabled chooser or guess when native classes are unavailable', () => {
        const { document } = parseHTML('<div class="shared"><a role="button" aria-disabled="true">Choose</a></div>');
        expect(libraryPillState(document as unknown as Document, '.shared a', null).link).toBeNull();
        expect(libraryPillState(document as unknown as Document, null, null).label).toBeNull();
    });
});

describe('library ownership updates', () => {
    it('refreshes after Steam finishes updating its overview, and unsubscribes on unmount', async () => {
        let notify = () => {};
        const unregister = vi.fn();
        const update = vi.fn();
        const stop = subscribeLibraryUpdates(update, (callback) => { notify = callback; return { unregister }; });
        notify();
        expect(update).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(update).toHaveBeenCalledOnce();
        notify();
        stop();
        await Promise.resolve();
        expect(update).toHaveBeenCalledOnce();
        expect(unregister).toHaveBeenCalledOnce();
    });
});
