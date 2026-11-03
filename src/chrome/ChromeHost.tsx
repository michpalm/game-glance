import {useCallback,useState} from 'react';
import {GameStatusBar} from '../components/GameStatusBar';
import {homeControlsCss} from '../home/homeControlsCss';
import {HomeSearch} from '../home/HomeSearchControl';
import {useSteamUiState} from '../home/steamUiState';
import {useChrome} from './useChrome';

/**
 * Mounted once in Steam's main window (a global component), for every page: the Game Glance status bar, Search and footer
 * CSS while the host has them (useChrome). The marker finds the window; the plugin's own `document` is another one.
 */
export function ChromeHost() {
    const [doc,setDoc]=useState<Document|null>(null);
    const marker=useCallback((el:HTMLSpanElement|null)=>{if(el)setDoc(el.ownerDocument);},[]);
    const chrome=useChrome(doc),ui=useSteamUiState(doc),active=chrome.mode==='active';
    return (
        <>
            <span ref={marker} style={{display:'none'}} />
            {chrome.mode!=='off'&&<>
                <style>{homeControlsCss}</style>
                {/* The replacement for Steam's bar, only while Steam's is found and hidden (no Steam bar, neither bar); focus redirected out of Steam's header must not fade it. It stays through a suspension it owned the bar before (held), so the menu's holds keep it up. */}
                {(chrome.bar||chrome.held)&&<GameStatusBar hidden={chrome.statusHidden} controls={chrome.controls} replacement={active} />}
                <HomeSearch search={chrome.search} active={active&&!chrome.statusHidden} account={ui.account} controls={chrome.controls} ownsInput={chrome.ownsInput} document={doc} />
            </>}
        </>
    );
}
