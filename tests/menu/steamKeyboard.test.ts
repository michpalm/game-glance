import { describe, expect, it, vi } from 'vitest';
import { openSteamKeyboard } from '../../src/menu/steam/keyboard';

describe('openSteamKeyboard: what Steam + X does, from the menu',()=>{
    it('sends Steam\'s handler the message a chord sends, for the running game',()=>{
        const OnModalKeyboardMessage=vi.fn();
        expect(openSteamKeyboard({OnModalKeyboardMessage,MainRunningAppID:4253691375})).toBe(true);
        expect(OnModalKeyboardMessage).toHaveBeenCalledWith({nAppID:4253691375,bChordInvoked:true,bEnterDismissesKeyboard:true,nXPosition:0,nYPosition:0,nWidth:0,nHeight:0});
    });
    it('no game: app 0',()=>{
        const OnModalKeyboardMessage=vi.fn();
        openSteamKeyboard({OnModalKeyboardMessage});
        expect(OnModalKeyboardMessage.mock.calls[0][0].nAppID).toBe(0);
    });
    it('a Steam without the handler, or one that throws: false, nothing breaks',()=>{
        expect(openSteamKeyboard(undefined)).toBe(false);
        expect(openSteamKeyboard({})).toBe(false);
        expect(openSteamKeyboard({OnModalKeyboardMessage:()=>{throw Error('x');}})).toBe(false);
    });
});
