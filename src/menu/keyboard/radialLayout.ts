import type {KeyDef,KeyboardLayout} from './layouts';
export type Side=0|1;
export type RadialLayout={letters:[KeyDef[],KeyDef[]];symbols:[KeyDef[],KeyDef[]]};
/** Preserve layout metadata; only rearrange key references, never Steam's arrays. */
export function buildRadialLayout(layout:KeyboardLayout):RadialLayout {
 const rows=layout.letters.slice(0,3).map(row=>row.filter(k=>k.kind==='char'));
 // The first five letter positions of each row belong to the left hand.
 // Keep the perimeter in keyboard order: top, right home keys, bottom, left home keys.
 const letters:[KeyDef[],KeyDef[]]=[[],[]];
 const rowText=rows.map(row=>row.map(key=>key.char).join('').toLowerCase());
 const familiarRows=rowText[0]?.startsWith('qwert')&&rowText[1]?.startsWith('asdfg')||rowText[0]?.startsWith('azert')&&rowText[1]?.startsWith('qsdfg');
 if(familiarRows)for(const side of [0,1] as const){
  const [top=[],home=[],bottom=[]]=rows.map(row=>side===0?row.slice(0,5):row.slice(5));
  const perimeter=[...top,...home.slice(2).reverse(),...bottom.slice().reverse(),...home.slice(0,2)];
  // Rendering and stick selection put index 1 at twelve o'clock: centre the third top-row key there.
  letters[side]=perimeter.length?[...perimeter.slice(1),perimeter[0]]:[];
 }
 // Other layouts may have punctuation among their letters. Their original physical hand
 // boundary cannot be inferred from compact letter-only rows, so retain the existing mapping.
 else for(const [i,row] of rows.entries()){
  const cut=Math.floor(row.length/2)+(row.length%2&&letters[0].length<=letters[1].length?1:0);
  for(const side of [0,1] as const){const part=side===0?row.slice(0,cut):row.slice(cut);letters[side].push(...(i===1?part.reverse():part));}
 }
 const seen=new Set<string>();
 const extras=[...layout.symbols.flat(),...layout.letters.flat().filter(k=>k.dead)].filter(k=>{
  if(k.kind!=='char'||k.char===' ')return false;
  const id=JSON.stringify([k.char,k.dead??null]);if(seen.has(id))return false;seen.add(id);return true;
 });
 const cut=Math.ceil(extras.length/2);
 return {letters,symbols:[extras.slice(0,cut),extras.slice(cut)]};
}
