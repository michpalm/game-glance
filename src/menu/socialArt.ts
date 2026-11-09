import {browserStores,guessedHeroUrls,heroUrls,type SteamStores} from '../home/artwork';
import type {FriendCard} from '../home/friends';

/** Positive Steam app IDs can use the shared hero fallback even without a local library overview. */
export function friendHeroUrls(friend:Pick<FriendCard,'state'|'appId'>,stores:SteamStores=browserStores):string[] {
    const id=friend.appId;
    if(friend.state!=='ingame'||id===null||!Number.isInteger(id)||id<=0||id>4294967295)return [];
    return [...new Set([...heroUrls(id,stores),...guessedHeroUrls(id)])];
}

/** The DOM src records progress across parent rerenders; never restart a failed candidate on every presence poll. */
export function advanceFriendHero(image:HTMLImageElement,sources:readonly string[]):void {
    const index=sources.indexOf(image.getAttribute('src')??'');
    if(index>=0&&index+1<sources.length)image.src=sources[index+1];
    else image.style.visibility='hidden'; // No broken-image icon or painted overlay when all artwork is unavailable.
}
