import {describe,it,expect,vi} from 'vitest';
import {friendHeroUrls,advanceFriendHero} from '../../src/menu/socialArt';
import {parseHTML} from 'linkedom';
import type {SteamStores} from '../../src/home/artwork';
const empty:SteamStores={details:()=>undefined,overview:()=>undefined};
describe('Social friend hero backgrounds',()=>{
 it('uses Steam hero paths even when the friend plays a game outside the local library',()=>{
  const result=friendHeroUrls({state:'ingame',appId:42},empty);
  expect(result).toContain('https://steamloopback.host/assets/42/library_hero.jpg');
  expect(result).toContain('https://shared.steamstatic.com/store_item_assets/steam/apps/42/library_hero.jpg');
 });
 it('prefers existing custom and known artwork and removes duplicate candidates',()=>{
  const stores:SteamStores={...empty,customHero:()=>['/customimages/42_hero.jpg'],details:()=>({libraryAssets:{strHeroImage:'library_hero.jpg'}})};
  const result=friendHeroUrls({state:'ingame',appId:42},stores)!;
  expect(result[0]).toContain('/customimages/');
  expect(result.filter(url=>url==='https://steamloopback.host/assets/42/library_hero.jpg')).toHaveLength(1);
 });
 it.each(['online','offline','away'] as const)('does not resolve artwork for %s friends',state=>{
  const details=vi.fn();expect(friendHeroUrls({state,appId:42},{...empty,details})).toEqual([]);expect(details).not.toHaveBeenCalled();
 });
 it.each([null,0,-1,NaN,1.5,4294967296])('ignores absent or invalid Steam app IDs (%s)',appId=>{
  expect(friendHeroUrls({state:'ingame',appId},empty)).toEqual([]);
 });
 it('tries missing images sequentially and leaves a plain row after all candidates fail',()=>{
  const {document}=parseHTML('<img src="https://example.test/hero.jpg">');const image=document.querySelector('img')! as unknown as HTMLImageElement;
  const sources=['https://example.test/hero.jpg','https://example.test/fallback.jpg'];
  advanceFriendHero(image,sources);expect(image.src).toBe(sources[1]);expect(image.style.visibility).not.toBe('hidden');
  advanceFriendHero(image,sources);expect(image.style.visibility).toBe('hidden');
 });
 it('keeps a safe Steam fallback if local artwork stores throw',()=>{
  const boom=()=>{throw Error('Unavailable store');};expect(friendHeroUrls({state:'ingame',appId:42},{details:boom,overview:boom})).toContain('https://steamloopback.host/assets/42/library_hero.jpg');
 });
});
