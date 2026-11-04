import type {LibraryEntry} from './model';
export interface IndexedEntry {entry:LibraryEntry;title:string;words:readonly string[]}
export const normalizeSearch=(text:string):string=>text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
export const indexLibrary=(entries:readonly LibraryEntry[]):readonly IndexedEntry[]=>entries.map(entry=>{const title=normalizeSearch(entry.title);return {entry,title,words:title.split(' ')};});
export function matchLibrary(index:readonly IndexedEntry[],query:string):readonly LibraryEntry[] {
 const q=normalizeSearch(query);if(!q)return [];const tokens=q.split(' ');
 return index.filter(i=>tokens.every(t=>i.title.includes(t))).map(i=>({i,tier:i.title===q?0:i.title.startsWith(q)?1:tokens.every(t=>i.words.some(w=>w.startsWith(t)))?2:3})).sort((a,b)=>a.tier-b.tier||(a.i.title<b.i.title?-1:a.i.title>b.i.title?1:0)||a.i.entry.appId-b.i.entry.appId).map(x=>x.i.entry);
}
