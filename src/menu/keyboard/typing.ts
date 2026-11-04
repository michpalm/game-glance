import type {KeyDef} from './layouts';

/** cursor: where typing goes, in letters as you see them (graphemes); none is the end, as before the cursor existed. */
export type TypingState={text:string;shift:'off'|'once'|'lock';held:KeyDef|null;cursor?:number};
export type CursorMove='left'|'right'|'start'|'end';

// The project's TS lib predates Intl.Segmenter.
type Segmenter=new(l?:string,o?:{granularity:'grapheme'})=>{segment(s:string):Iterable<{segment:string}>};
const graphemes=(s:string)=>Array.from(new (Intl as unknown as {Segmenter:Segmenter}).Segmenter(undefined,{granularity:'grapheme'}).segment(s),g=>g.segment);
const typed=(k:KeyDef,shift:TypingState['shift'])=>shift==='off'?k.char:k.shifted??k.char.toUpperCase();

/** The cursor's place in letters, kept inside the text. */
export const cursorOf=(s:TypingState):number=>{const n=graphemes(s.text).length;return s.cursor===undefined?n:Math.max(0,Math.min(n,Math.round(s.cursor)));};
// At the end the cursor is left out again, so text typed without moving it reads as it always did.
const placed=(s:TypingState,letters:string[],cursor:number):TypingState=>{const {cursor:_,...rest}=s;const text=letters.join('');return cursor>=letters.length?{...rest,text}:{...rest,text,cursor};};
// Puts text in at the cursor and spends a one-shot shift.
const insert=(s:TypingState,text:string):TypingState=>{const letters=graphemes(s.text),at=cursorOf(s),added=graphemes(text);return placed(s,[...letters.slice(0,at),...added,...letters.slice(at)],at+added.length);};
const write=(s:TypingState,text:string,held:KeyDef|null=null):TypingState=>({...insert(s,text),shift:s.shift==='once'?'off':s.shift,held});

export function press(s:TypingState,k:KeyDef):TypingState {
    switch(k.kind){
        case 'page':case 'send':return s;
        case 'shift':return {...s,shift:s.shift==='off'?'once':s.shift==='once'?'lock':'off'};
        case 'backspace':{if(s.held)return {...s,held:null};const letters=graphemes(s.text),at=cursorOf(s);return at===0?s:placed(s,[...letters.slice(0,at-1),...letters.slice(at)],at-1);}
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
export const typeText=(s:TypingState,text:string):TypingState=>insert(s,text);

/** The D-pad (or a keyboard's arrows): one letter left or right, or to the start or end. A held accent is dropped. */
export function moveCursor(s:TypingState,move:CursorMove):TypingState {
    const at=cursorOf(s),letters=graphemes(s.text);
    const next=move==='left'?Math.max(0,at-1):move==='right'?Math.min(letters.length,at+1):move==='start'?0:letters.length;
    return placed({...s,held:null},letters,next);
}
