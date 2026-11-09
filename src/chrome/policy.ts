import type {ChromeClaim} from './claims';

export type ChromeMode='off'|'suspended'|'active';
export function chromeMode(p:{optedIn:boolean;everyPage:boolean;claims:readonly ChromeClaim[];suspended:boolean}):ChromeMode {
    if(!p.optedIn||(!p.everyPage&&p.claims.length===0))return 'off';
    return p.suspended?'suspended':'active';
}
export const chromeLaunching=(claims:readonly ChromeClaim[]):boolean=>claims.some(claim=>claim.launching);
export const chromeStatusHidden=(claims:readonly ChromeClaim[]):boolean=>claims.some(claim=>claim.statusHidden);
export const chromeReturn=(claims:readonly ChromeClaim[]):(()=>void)|undefined=>claims.find(claim=>claim.page==='home')?.returnHome;
