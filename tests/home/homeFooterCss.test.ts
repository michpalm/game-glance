import {describe,it,expect} from 'vitest';
import * as controls from '../../src/home/homeControlsCss';
import {homeFooterSuspended,homeRuntimeSuspended} from '../../src/home/useHomeControls';
const rules=(css:string)=>css.split('}').map(line=>line.trim()).filter(Boolean);
describe('Home controls stylesheet',()=>{
 it('is unchanged by the footer split (snapshot taken at 6c9ea51, before it)',()=>{expect(controls.homeControlsCss).toMatchSnapshot();});
 it('shares the footer rules as homeFooterCss, which Home composes in unchanged',()=>{
  expect(controls.homeControlsCss).toContain(controls.homeFooterCss);
  const footer=rules(controls.homeFooterCss);
  expect(footer.length).toBeGreaterThan(5);
  for(const rule of footer)expect(rule.startsWith('[data-gh-footer')).toBe(true);
  // Every footer-owned rule lives in the shared part, except Home's own Search hide (Home-only: the page has no Search).
  for(const rule of rules(controls.homeControlsCss).filter(rule=>rule.startsWith('[data-gh-footer')))expect(footer).toContain(rule);
  expect(controls.homeFooterCss).not.toMatch(/gh-search|gh-status|gh-keyboard|html:has/);
 });
 it('styles Home fully when active, the footer alone while only the footer is held, else nothing',()=>{
  expect(controls.homeControlsStyle(true,true)).toBe(controls.homeControlsCss);
  expect(controls.homeControlsStyle(false,true)).toBe(controls.homeFooterCss);
  expect(controls.homeControlsStyle(false,false)).toBeNull();
 });
});
describe('footer suspension',()=>{
 const live={foreground:true,menu:false,opening:false,launching:false,connected:true,hidden:false};
 it('keeps the footer through the open transition while Home itself suspends',()=>{
  expect(homeRuntimeSuspended({...live,opening:true})).toBe(true);
  expect(homeFooterSuspended({...live,opening:true})).toBe(false);
  expect(homeFooterSuspended(live)).toBe(false);
 });
 it.each([['foreground',false],['menu',true],['launching',true],['connected',false],['hidden',true]] as const)('still gives the footer back when %s says so',(key,value)=>{
  expect(homeFooterSuspended({...live,[key]:value})).toBe(true);
 });
});
