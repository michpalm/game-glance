import {expect,it} from 'vitest';
import type {ReactElement,ReactNode} from 'react';
import {RadialKeyboardView} from '../../src/menu/components/RadialKeyboard';
import {buildRadialLayout} from '../../src/menu/keyboard/radialLayout';
import {BUILTIN_QWERTY} from '../../src/menu/keyboard/layouts';
function nodes(node:ReactNode):ReactElement<Record<string,any>>[]{if(Array.isArray(node))return node.flatMap(nodes);if(!node||typeof node!=='object'||!('props'in node))return [];const e=node as ReactElement<Record<string,any>>;return [e,...nodes(e.props.children)];}
it('shows separate circular wheels and blank centres without another compose field',()=>{
 const all=nodes(RadialKeyboardView({bounds:[{left:12,top:200,diameter:180},{left:600,top:200,diameter:180}],layout:buildRadialLayout(BUILTIN_QWERTY),state:{selection:[null,1],extra:[false,false],uppercase:true},short:'EN',type:()=>{}}));
 expect(all.filter(n=>n.props['data-gg-frost-region']).map(n=>n.props['data-gg-frost-region'])).toEqual(['keyboard-left','keyboard-right']);
 const centres=all.filter(n=>n.props.className==='gg-radial-chosen');expect(centres[0].props.children).toBe('');expect(centres[1].props.children).toBe('U');
 expect(all.filter(n=>n.type==='input'||n.type==='textarea')).toEqual([]);
 expect(all.filter(n=>n.props.className==='gg-radial-key')).toHaveLength(26);
});
