export type Stop = () => void;
export interface LibraryEntry {appId:number;title:string;edition?:string;kind:'game'|'demo'|'shortcut';installed:boolean|null}
export type LibrarySnapshot = {status:'loading'|'unavailable';account:string|null}|{status:'ready';account:string;entries:readonly LibraryEntry[]};
export interface ResultMetadata {capsuleUrls:readonly string[];installed:boolean|null}
