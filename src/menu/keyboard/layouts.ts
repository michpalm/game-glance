export type KeyKind='char'|'shift'|'backspace'|'page'|'space'|'send';
export type KeyDef={char:string;shifted?:string;dead?:{next:string;combined:string};hint?:string;kind:KeyKind};
export type KeyboardLayout={id:number;name:string;short:string;letters:KeyDef[][];symbols:KeyDef[][];ime:boolean};
export interface SteamLayoutSource {
    all():unknown[]|null;
    selected():{currentLayout:number;selectedLayouts:number[]}|null;
}
type Entry={name:string;layout:number;rgLayout(options:object):unknown};
type Dead={key:string;dead:true;dead_next:string;dead_combined:string};

const key=(char:string,kind:KeyKind='char',more:Partial<KeyDef>={}):KeyDef=>({char,kind,...more});
const SHORT:Record<string,string>={spanish:'ES',qwerty:'EN',swedish:'SV'};
const shortOf=(name:string)=>SHORT[name]??name.slice(0,2).toUpperCase();
const isDead=(v:unknown):v is Dead=>!!v&&typeof v==='object'&&(v as Dead).dead===true;
const isString=(v:unknown):v is string=>typeof v==='string';
const deadDef=(d:Dead):KeyDef=>key(d.key,'char',{dead:{next:d.dead_next,combined:d.dead_combined}});

// A key position is a string, [normal, shifted?, altGr?] (null allowed), or an object (special or dead key).
function validObject(v:unknown):boolean {
    if(!v||typeof v!=='object')return false;
    const o=v as Record<string,unknown>;
    if(o.dead===true)return isString(o.key)&&isString(o.dead_next)&&isString(o.dead_combined)&&o.dead_next.length===o.dead_combined.length;
    return isString(o.key)&&typeof o.type==='number';
}
const validKey=(k:unknown)=>k==null||isString(k)||validObject(k)||Array.isArray(k)&&k.every(c=>c==null||isString(c)||validObject(c));
const layer=(k:unknown,i:number)=>Array.isArray(k)?k[i]:i===0?k:undefined;

function compactRows(rows:unknown):{letters:KeyDef[][];symbols:KeyDef[][]}|null {
    if(!Array.isArray(rows)||rows.length<5)return null;
    const main=rows.slice(0,4);
    if(!main.every(r=>Array.isArray(r)&&r.every(validKey)))return null;
    // Letter rows: every key whose normal character is a letter, in order.
    const letterRows=[1,2,3].map(i=>(main[i] as unknown[]).flatMap(k=>{
        const n=layer(k,0),s=layer(k,1);
        if(!isString(n)||!/\p{L}/u.test(n))return [];
        return [key(n,'char',{shifted:isString(s)&&s?s:n.toUpperCase()})];
    }));
    if(letterRows.some(r=>!r.length))return null;
    letterRows[2]=[key('⇧','shift'),...letterRows[2],key('⌫','backspace')];
    letterRows[0].slice(0,10).forEach((k,i)=>{k.hint='1234567890'[i];});
    // Accent keys: dead keys on the normal layer, longest dead_next first, reading order on ties.
    const deads:{d:Dead;at:[number,number]}[]=[];
    main.forEach((r,ri)=>(r as unknown[]).forEach((k,ci)=>{const n=layer(k,0);if(isDead(n))deads.push({d:n,at:[ri,ci]});}));
    deads.sort((a,b)=>b.d.dead_next.length-a.d.dead_next.length);
    const first=deads[0];
    const shiftedDead=first&&layer((main[first.at[0]] as unknown[])[first.at[1]],1);
    const second=isDead(shiftedDead)?shiftedDead:deads[1]?.d;
    const present=new Set(main.flatMap(r=>(r as unknown[]).flatMap(k=>Array.isArray(k)?k:[k])).filter(isString));
    const space=key(' ','space');
    const letters=[...letterRows,[key('?123','page'),key(','),first?deadDef(first.d):key("'"),space,key('.'),key('✓','send')]];
    const bottom=[...'¿¡'].filter(c=>present.has(c)).concat([...'!?"\':;']).slice(0,8);
    const symbols=[
        [...'1234567890'].map(c=>key(c)),
        [...'@#€%&-+()/'].map(c=>key(c)),
        [...bottom.map(c=>key(c)),key('⌫','backspace')],
        [key('ABC','page'),key(','),second?deadDef(second):key('"'),space,key('.'),key('✓','send')],
    ];
    return {letters,symbols};
}

const IME=/^(schinese|tchinese|japanese|korean)/;
export function compactLayout(entry:Entry):KeyboardLayout|null {
    try{
        const rows=compactRows(entry.rgLayout({}));
        if(!rows)return null;
        const short=shortOf(entry.name),ime=IME.test(entry.name);
        const label=(r:KeyDef[][])=>r.map(row=>row.map(k=>k.kind==='space'?{...k,hint:short}:k));
        return {id:entry.layout,name:entry.name,short,letters:label(rows.letters),symbols:label(rows.symbols),ime};
    }catch{return null;}
}

const ACUTE={next:' aAeEiIoOuUyY',combined:'´áÁéÉíÍóÓúÚýÝ'},DIAERESIS={next:' aAeEiIoOuUy',combined:'¨äÄëËïÏöÖüÜÿ'};
const row=(s:string,more:Partial<KeyDef>={})=>[...s].map(c=>key(c,'char',{shifted:c.toUpperCase(),...more}));
export const BUILTIN_QWERTY:KeyboardLayout={
    id:0,name:'qwerty',short:'EN',ime:false,
    letters:[
        row('qwertyuiop').map((k,i)=>({...k,hint:'1234567890'[i]})),
        row('asdfghjkl'),
        [key('⇧','shift'),...row('zxcvbnm'),key('⌫','backspace')],
        [key('?123','page'),key(','),key('´','char',{dead:ACUTE}),key(' ','space',{hint:'EN'}),key('.'),key('✓','send')],
    ],
    symbols:[
        [...'1234567890'].map(c=>key(c)),
        [...'@#€%&-+()/'].map(c=>key(c)),
        [...[...'!?"\':;'].map(c=>key(c)),key('⌫','backspace')],
        [key('ABC','page'),key(','),key('¨','char',{dead:DIAERESIS}),key(' ','space',{hint:'EN'}),key('.'),key('✓','send')],
    ],
};

export function readLayouts(source:SteamLayoutSource|null):{layouts:KeyboardLayout[];current:number} {
    const fallback={layouts:[BUILTIN_QWERTY],current:0};
    if(!source)return fallback;
    try{
        const all=source.all();
        if(!Array.isArray(all))return fallback;
        const sel=source.selected(),id=sel?.currentLayout;
        // The current entry decides input method by its name, even when its rows are rejected: the field keeps Steam's
        // keyboard. Its stand-in carries QWERTY rows that are never drawn.
        const imeStandIn=(e:unknown):KeyboardLayout|null=>{
            try{
                const o=e as Partial<Entry>|null;
                return o&&typeof o==='object'&&typeof o.layout==='number'&&o.layout===id&&typeof o.name==='string'&&IME.test(o.name)?{...BUILTIN_QWERTY,id:o.layout,name:o.name,short:shortOf(o.name),ime:true}:null;
            }catch{return null;}
        };
        const layouts=all.map(e=>compactLayout(e as Entry)??imeStandIn(e)).filter((l):l is KeyboardLayout=>!!l);
        if(!layouts.length)return fallback;
        const current=Math.max(0,layouts.findIndex(l=>l.id===id));
        const chosen=Array.isArray(sel?.selectedLayouts)?sel.selectedLayouts.map(i=>layouts.find(l=>l.id===i)).filter((l):l is KeyboardLayout=>!!l):[];
        const shown=chosen.length?chosen:[layouts[current]];
        const label=[...shown.filter(l=>l===layouts[current]),...shown.filter(l=>l!==layouts[current])].map(l=>l.short).join(' · ');
        const relabel=(r:KeyDef[][])=>r.map(x=>x.map(k=>k.kind==='space'?{...k,hint:label}:k));
        return {layouts:layouts.map(l=>({...l,letters:relabel(l.letters),symbols:relabel(l.symbols)})),current};
    }catch{return fallback;}
}

const textOf=(f:unknown)=>{try{return String(f);}catch{return '';}};
// A list getter only reads: no arguments, and no write in its text (Steam's setter writes currentLayout/selectedLayouts).
const WRITES=/(?:Set|Save|Update)(?![a-z])|\.(?:currentLayout|selectedLayouts)\s*=[^=]/;
export function findSteamLayoutSource(modules:Iterable<Record<string,unknown>>):SteamLayoutSource|null {
    let all:(()=>unknown)|null=null,store:Record<string,unknown>|null=null;
    for(const m of modules){
        let values:unknown[]=[];
        try{values=[m,...Object.values(m)];}catch{continue;}
        for(const v of values){
            if(typeof v==='function'){
                if(all)continue;
                let arity=-1;
                try{arity=v.length;}catch{/* opaque */}
                const t=arity===0?textOf(v):'';
                if(t.includes('GetKeyboardLayoutSettings')&&t.includes('selectedLayouts')&&t.includes('.filter(')&&!WRITES.test(t))all=v as ()=>unknown;
            }else if(v&&typeof v==='object'&&!store){
                try{if('m_userLayoutSettings' in v)store=v as Record<string,unknown>;}catch{/* opaque proxy */}
            }
        }
    }
    if(!all)return null;
    const list=all;
    return {
        all:()=>{const r=list();return Array.isArray(r)?r:null;},
        selected:()=>{
            const s=store?.m_userLayoutSettings as {currentLayout?:unknown;selectedLayouts?:unknown}|undefined;
            return s&&typeof s.currentLayout==='number'&&Array.isArray(s.selectedLayouts)&&s.selectedLayouts.every(n=>typeof n==='number')?{currentLayout:s.currentLayout,selectedLayouts:[...s.selectedLayouts as number[]]}:null;
        },
    };
}
