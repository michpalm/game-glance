import type {KeyDef} from './layouts';

export type TypingState={text:string;shift:'off'|'once'|'lock';held:KeyDef|null};

// The project's TS lib predates Intl.Segmenter.
type Segmenter=new(l?:string,o?:{granularity:'grapheme'})=>{segment(s:string):Iterable<{segment:string}>};
const graphemes=(s:string)=>Array.from(new (Intl as unknown as {Segmenter:Segmenter}).Segmenter(undefined,{granularity:'grapheme'}).segment(s),g=>g.segment);
const typed=(k:KeyDef,shift:TypingState['shift'])=>shift==='off'?k.char:k.shifted??k.char.toUpperCase();

// Appends text and spends a one-shot shift.
const write=(s:TypingState,text:string,held:KeyDef|null=null):TypingState=>({text:s.text+text,shift:s.shift==='once'?'off':s.shift,held});

export function press(s:TypingState,k:KeyDef):TypingState {
    switch(k.kind){
        case 'page':case 'send':return s;
        case 'shift':return {...s,shift:s.shift==='off'?'once':s.shift==='once'?'lock':'off'};
        case 'backspace':return s.held?{...s,held:null}:{...s,text:graphemes(s.text).slice(0,-1).join('')};
    }
    const c=typed(k,s.shift),held=s.held?.dead;
    if(held){
        const i=Array.from(held.next).indexOf(c);
        if(i>=0)return write(s,Array.from(held.combined)[i]);
        // No combination: the accent stands alone, then the key is handled as if pressed fresh.
        const accent=write(s,s.held!.char);
        return k.dead?{...accent,held:k}:write(accent,c);
    }
    return k.dead?{...s,held:k}:write(s,c);
}

export const clearHeld=(s:TypingState):TypingState=>s.held?{...s,held:null}:s;

// Physical keyboard: the text is already composed.
export const typeText=(s:TypingState,text:string):TypingState=>({...s,text:s.text+text});
