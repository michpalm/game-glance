import type {KeyDef,KeyboardLayout} from './layouts';
export type Side=0|1;
export type RadialLayout={letters:[KeyDef[],KeyDef[]];symbols:[KeyDef[],KeyDef[]]};
/** Preserve layout metadata; only rearrange key references, never Steam's arrays. */
export function buildRadialLayout(layout:KeyboardLayout):RadialLayout {
 const rows=layout.letters.slice(0,3).map(row=>row.filter(k=>k.kind==='char'));
 const letters:[KeyDef[],KeyDef[]]=[[],[]];
 for(const [i,row] of rows.entries()){
  const cut=Math.floor(row.length/2)+(row.length%2&&letters[0].length<=letters[1].length?1:0);
  for(const side of [0,1] as const){const part=side===0?row.slice(0,cut):row.slice(cut);letters[side].push(...(i===1?part.reverse():part));}
 }
 const all=rows.flat(),byChar=new Map(all.map(k=>[k.char,k]));
 const spanish=['qwertçgfdsazxc','yuiopñlkjhvbnm'];
 if(layout.name.toLowerCase()==='spanish'&&all.length===28&&byChar.size===28&&spanish.every(s=>[...s].every(c=>byChar.has(c)))){
  letters[0]=[...spanish[0]].map(c=>byChar.get(c)!);letters[1]=[...spanish[1]].map(c=>byChar.get(c)!);
 }
 const seen=new Set<string>();
 const extras=[...layout.symbols.flat(),...layout.letters.flat().filter(k=>k.dead)].filter(k=>{
  if(k.kind!=='char'||k.char===' ')return false;
  const id=JSON.stringify([k.char,k.dead??null]);if(seen.has(id))return false;seen.add(id);return true;
 });
 const cut=Math.ceil(extras.length/2);
 return {letters,symbols:[extras.slice(0,cut),extras.slice(cut)]};
}
