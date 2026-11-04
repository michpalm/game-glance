import {describe,it,expect} from 'vitest';
import {reduceHomeSearch,homeSearchBounds,initialHomeSearch,type HomeSearchState} from '../../src/home/homeSearch';
const initial:HomeSearchState=initialHomeSearch('one');
describe('Home search preview',()=>{
 it('reveals only on top entry, opens editing there, completes without submission and retains the draft until account changes',()=>{
  expect(reduceHomeSearch(initial,{type:'edit'})).toBe(initial);
  let state=reduceHomeSearch(initial,{type:'enter'});expect(state.phase).toBe('top');
  state=reduceHomeSearch(state,{type:'edit'});expect(state.phase).toBe('editing');
  state=reduceHomeSearch(state,{type:'draft',text:'Example'});
  expect(reduceHomeSearch(state,{type:'complete'})).toEqual({...state,phase:'field',focusedAppId:null});
  for(const type of ['content','suspend'] as const)expect(reduceHomeSearch(state,{type})).toEqual({...state,phase:'hidden',epoch:state.epoch+1});
  expect(reduceHomeSearch(state,{type:'account',account:'two'})).toEqual(initialHomeSearch('two',state.epoch+1));
  expect(reduceHomeSearch(state,{type:'account',account:'one'})).toBe(state);
 });
 it('ignores draft writes outside editing and repeat events preserve identity',()=>{
  expect(reduceHomeSearch(initial,{type:'draft',text:'late'})).toBe(initial);
  expect(reduceHomeSearch(initial,{type:'suspend'})).toBe(initial);
  const state=reduceHomeSearch(initial,{type:'enter'});expect(reduceHomeSearch(state,{type:'enter'})).toBe(state);
 });
 it.each([[829,467,355],[1280,800,773],[1500,845,966]])('fits compact and expanded fields before dense status at %s×%s',(width,height,left)=>{
  for(const editing of [false,true]){const box=homeSearchBounds({width,height},{left,top:4,width:width-left,height:32},editing)!;expect(box.left).toBeGreaterThanOrEqual(12);expect(box.left+box.width).toBeLessThanOrEqual(left-12);expect(box.top).toBeGreaterThanOrEqual(4);expect(box.width).toBeGreaterThanOrEqual(editing?180:110);}
 });
 it('rejects unusable geometry rather than drawing over status',()=>{expect(homeSearchBounds({width:829,height:467},{left:100,top:4,width:729,height:32},true)).toBeNull();expect(homeSearchBounds({width:0,height:0},{left:0,top:0,width:0,height:0},false)).toBeNull();});
});
