import {afterEach,describe,it,expect,vi} from 'vitest';
import {parseHTML} from 'linkedom';
import {getSteamUiState,subscribeSteamUiState} from '../../src/home/steamUiState';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('shares one timer, observes ownership/account and removes work after last subscriber',()=>{
 vi.useFakeTimers();const {document,window}=parseHTML('<html><body></body></html>');let focused=true,menu=false;
 document.hasFocus=()=>focused;vi.stubGlobal('SteamUIStore',{WindowStore:{GamepadUIMainWindowInstance:{MenuStore:{IsAnySideMenuVisible:()=>menu}}}});vi.stubGlobal('App',{m_CurrentUser:{strSteamID:'account-one'}});
 const doc=document as unknown as Document,a=vi.fn(),b=vi.fn(),stopA=subscribeSteamUiState(doc,a),stopB=subscribeSteamUiState(doc,b);expect(vi.getTimerCount()).toBe(1);const before=getSteamUiState(doc);vi.advanceTimersByTime(250);expect(getSteamUiState(doc)).toBe(before);
 menu=true;vi.advanceTimersByTime(250);expect(getSteamUiState(doc).menu).toBe(true);expect(a).toHaveBeenCalled();focused=false;window.dispatchEvent(new window.Event('blur'));expect(getSteamUiState(doc).foreground).toBe(false);
 (globalThis as any).App.m_CurrentUser.strSteamID='account-two';vi.advanceTimersByTime(250);expect(getSteamUiState(doc).account).toBe('account-two');stopA();expect(vi.getTimerCount()).toBe(1);stopB();expect(vi.getTimerCount()).toBe(0);
});
