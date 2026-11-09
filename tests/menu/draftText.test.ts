import {describe,expect,it} from 'vitest';
import {draftParts,scrollFor} from '../../src/menu/components/DraftText';

describe('the draft around the cursor',()=>{
 it('splits by letters, so an emoji stays whole',()=>{
  expect(draftParts('a👍🏽b',1)).toEqual(['a','👍🏽b']);
  expect(draftParts('Mini Motorways',5)).toEqual(['Mini ','Motorways']);
 });
 it('puts the cursor at the end when there is none, and keeps it inside the text',()=>{
  expect(draftParts('ab',null)).toEqual(['ab','']);
  expect(draftParts('ab',9)).toEqual(['ab','']);
  expect(draftParts('ab',-1)).toEqual(['','ab']);
 });
});
describe('keeping the caret in view',()=>{
 it('leaves the text where it is while the caret is inside',()=>{expect(scrollFor(40,0,100)).toBe(0);expect(scrollFor(50,20,100)).toBe(20);});
 it('scrolls right so the caret keeps 8 px from the edge',()=>expect(scrollFor(150,0,100)).toBe(58));
 it('scrolls left to the caret, never past the start',()=>{expect(scrollFor(10,40,100)).toBe(2);expect(scrollFor(3,40,100)).toBe(0);});
});
