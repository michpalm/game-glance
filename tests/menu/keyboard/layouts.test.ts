import { describe, expect, it, vi } from 'vitest';
import { BUILTIN_QWERTY, compactLayout, findSteamLayoutSource, readLayouts, type SteamLayoutSource } from '../../../src/menu/keyboard/layouts';
import { SPANISH_ROWS } from './spanish.fixture';

const QWERTY_ROWS:unknown[][]=[
    [['`','~'],['1','!'],['2','@'],['3','#'],['4','$'],['5','%'],['6','^'],['7','&'],['8','*'],['9','('],['0',')'],['-','_'],['=','+'],{key:'Backspace',label:'#Key_Backspace',type:9}],
    [{key:'Tab',label:'#Key_Tab',type:3},'q','w','e','r','t','y','u','i','o','p',['[','{'],[']','}'],['\\','|']],
    [{key:'CapsLock',label:'#Key_Caps',type:6},'a','s','d','f','g','h','j','k','l',[';',':'],["'",'"'],{key:'Enter',label:'#Key_Enter',type:1}],
    [{key:'Shift',label:'#Key_Shift',type:7},'z','x','c','v','b','n','m',[',','<'],['.','>'],['/','?'],{key:'Shift',label:'#Key_Shift',type:8}],
    [],
];
const spanish=()=>({name:'spanish',layout:19,rgLayout:()=>SPANISH_ROWS});
const qwerty=()=>({name:'qwerty',layout:0,rgLayout:()=>QWERTY_ROWS});
const chars=(row:{char:string}[])=>row.map(k=>k.char);
const source=(over:Partial<SteamLayoutSource>={}):SteamLayoutSource=>({all:()=>null,selected:()=>null,...over});
// Steam's functions are told apart by their source text, so fakes carry the text.
const fake=<T extends (...a:never[])=>unknown>(fn:T,text:string):T=>Object.assign(fn,{toString:()=>text});

describe('layout compaction',()=>{
    it("compacts Steam's Spanish rows into the canvas layout",()=>{
        const l=compactLayout(spanish())!;
        expect(l.letters[0].map(k=>k.char)).toEqual([...'qwertyuiop','ç']);
        expect(l.letters[0].slice(0,10).map(k=>k.hint)).toEqual([...'1234567890']);
        expect(l.letters[1].map(k=>k.char)).toEqual([...'asdfghjklñ']);
        expect(l.letters[2].map(k=>k.kind)).toEqual(['shift',...Array(7).fill('char'),'backspace']);
        expect(chars(l.letters[2])).toEqual(['⇧',...'zxcvbnm','⌫']);
        expect(l.letters[3].map(k=>k.char)).toEqual(['?123',',','´',' ','.','✓']);
        expect(l.letters[3][2].dead).toEqual({next:' aAeEiIoOuUyY',combined:'´áÁéÉíÍóÓúÚýÝ'});
        expect(l.symbols[2].map(k=>k.char)).toEqual(['¿','¡','!','?','"',"'",':',';','⌫']);
        expect(l.symbols[3].map(k=>k.char)).toEqual(['ABC',',','¨',' ','.','✓']);
        expect(l.symbols[3][2].dead).toEqual({next:' aAeEiIoOuUy',combined:'¨äÄëËïÏöÖüÜÿ'});
        expect([l.letters.length,l.symbols.length]).toEqual([4,4]);
        expect([l.id,l.name,l.short,l.ime]).toEqual([19,'spanish','ES',false]);
    });
    it('shifts letters (also when Steam gives no shifted layer) and labels pages and send',()=>{
        const l=compactLayout(spanish())!;
        expect(l.letters[0].at(-1)).toMatchObject({char:'ç',shifted:'Ç',kind:'char'});
        expect(l.letters[3][0]).toMatchObject({kind:'page'});
        expect(l.letters[3][5]).toMatchObject({kind:'send'});
        expect(l.letters[3][3]).toMatchObject({kind:'space'});
        expect(l.symbols[0].map(k=>k.char)).toEqual([...'1234567890']);
        expect(l.symbols[1].map(k=>k.char)).toEqual([...'@#€%&-+()/']);
    });
    it('picks the main accent by longest dead_next, and plain quotes when there is none',()=>{
        const none=compactLayout(qwerty())!;
        expect(none.letters[3][2]).toMatchObject({char:"'"});
        expect(none.letters[3][2].dead).toBeUndefined();
        expect(none.symbols[3][2]).toMatchObject({char:'"'});
        expect(none.symbols[3][2].dead).toBeUndefined();
        expect(chars(none.symbols[2])).toEqual(['!','?','"',"'",':',';','⌫']);
    });
    it('returns null on any shape mismatch',()=>{
        const bad=(rgLayout:()=>unknown)=>compactLayout({name:'x',layout:1,rgLayout});
        expect(bad(()=>{throw Error('x');})).toBeNull();
        expect(bad(()=>null)).toBeNull();
        expect(bad(()=>[[],[],[]])).toBeNull();
        expect(bad(()=>[[],[7],[],[],[]])).toBeNull();
        expect(bad(()=>[[],[{key:'a',label:'a',dead:true,dead_next:'ab',dead_combined:'x'}],[],[],[]])).toBeNull();
        expect(bad(()=>[[],[],[],[],[]])).toBeNull();
    });
    it("marks input-method layouts so the field keeps Steam's keyboard",()=>{
        for(const name of ['schinese','tchinese','japanese','korean'])
            expect(compactLayout({name,layout:3,rgLayout:()=>QWERTY_ROWS})!.ime).toBe(true);
        expect(compactLayout(qwerty())!.ime).toBe(false);
    });
    it('derives short names',()=>{
        const short=(name:string)=>compactLayout({name,layout:1,rgLayout:()=>QWERTY_ROWS})!.short;
        expect([short('qwerty'),short('swedish'),short('german')]).toEqual(['EN','SV','GE']);
    });
});

describe('reading layouts',()=>{
    it('falls back to the built-in QWERTY on a throw, malformed rows or no module',()=>{
        expect(BUILTIN_QWERTY.short).toBe('EN');
        expect(BUILTIN_QWERTY.letters[3][2].dead?.next).toBe(' aAeEiIoOuUyY');
        expect(BUILTIN_QWERTY.symbols[3][2].dead?.next).toBe(' aAeEiIoOuUy');
        const cases:(SteamLayoutSource|null)[]=[
            null,
            source(),
            source({all:()=>{throw Error('gone');}}),
            source({all:()=>[{name:'spanish',layout:19,rgLayout:()=>'nope'}]}),
            source({all:()=>[{name:'spanish',layout:19,rgLayout:()=>{throw Error('x');}}]}),
            source({all:()=>[]}),
        ];
        for(const c of cases){
            const r=readLayouts(c);
            expect(r.layouts[0]).toBe(BUILTIN_QWERTY);
            expect(r.current).toBe(0);
        }
    });
    it('reads every entry and the current one from the store',()=>{
        const r=readLayouts(source({all:()=>[qwerty(),spanish(),{name:'bad',layout:5,rgLayout:()=>1}],selected:()=>({currentLayout:19,selectedLayouts:[0,19]})}));
        expect(r.layouts.map(l=>l.id)).toEqual([0,19]);
        expect(r.current).toBe(1);
        const none=readLayouts(source({all:()=>[qwerty(),spanish()]}));
        expect([none.layouts.length,none.current]).toEqual([2,0]);
    });
    it('labels the space bar with only the current layout when the selected list names none of them',()=>{
        const swedish={name:'swedish',layout:7,rgLayout:()=>QWERTY_ROWS};
        const r=readLayouts(source({all:()=>[qwerty(),spanish(),swedish],selected:()=>({currentLayout:19,selectedLayouts:[99]})}));
        expect(r.layouts.length).toBe(3);
        for(const l of r.layouts)expect(l.letters[3][3].hint).toBe('ES');
    });
    // An input-method layout must keep Steam's text field even when its rows cannot be read.
    it('marks the current layout as input-method by its name when its rows are rejected',()=>{
        const japanese={name:'japanese',layout:30,rgLayout:()=>'not rows'};
        const r=readLayouts(source({all:()=>[qwerty(),japanese],selected:()=>({currentLayout:30,selectedLayouts:[0,30]})}));
        expect(r.layouts[r.current]).toMatchObject({id:30,ime:true});
        const only=readLayouts(source({all:()=>[{name:'koreana',layout:31,rgLayout:()=>{throw Error('x');}}],selected:()=>({currentLayout:31,selectedLayouts:[31]})}));
        expect(only.layouts[only.current]).toMatchObject({id:31,ime:true});
        // Not the current one, or not an input method: still left out.
        const other=readLayouts(source({all:()=>[qwerty(),japanese,{name:'french',layout:8,rgLayout:()=>1}],selected:()=>({currentLayout:0,selectedLayouts:[0]})}));
        expect(other.layouts.map(l=>l.id)).toEqual([0]);
    });
    it('labels the space bar with the selected layouts',()=>{
        const r=readLayouts(source({all:()=>[qwerty(),spanish()],selected:()=>({currentLayout:0,selectedLayouts:[0,19]})}));
        for(const l of r.layouts){
            expect(l.letters[3][3]).toMatchObject({char:' ',hint:'EN · ES'});
            expect(l.symbols[3][3]).toMatchObject({char:' ',hint:'EN · ES'});
        }
        const flipped=readLayouts(source({all:()=>[qwerty(),spanish()],selected:()=>({currentLayout:19,selectedLayouts:[19,0]})}));
        expect(flipped.layouts[0].letters[3][3].hint).toBe('ES · EN');
    });
    it('lists the current layout first, then the others in selection order',()=>{
        const r=readLayouts(source({all:()=>[qwerty(),spanish()],selected:()=>({currentLayout:19,selectedLayouts:[0,19]})}));
        expect(r.layouts[0].letters[3][3].hint).toBe('ES · EN');
        expect(r.layouts[1].symbols[3][3].hint).toBe('ES · EN');
    });
});

describe('finding the Steam source',()=>{
    const entries=[spanish()];
    const allFn=()=>fake(()=>entries,'() => GetKeyboardLayoutSettings().selectedLayouts.filter(x => x)');
    // The real list getter, as read on the Ally (minified).
    const realAll=()=>fake(()=>entries,'function le(){const e=o.GetKeyboardLayoutSettings();return W.filter(t=>t.layout===e.currentLayout||e.selectedLayouts.includes(t.layout))}');
    it('finds the list getter by source text, not export names, and the current layout in the store',()=>{
        const store={m_userLayoutSettings:{currentLayout:19,selectedLayouts:[19]}};
        const s=findSteamLayoutSource([{zz:1},{ab:allFn()},{thing:store}])!;
        expect(s).not.toBeNull();
        expect(s.all()).toBe(entries);
        expect(s.selected()).toEqual({currentLayout:19,selectedLayouts:[19]});
        expect('current' in s).toBe(false);
        expect(readLayouts(s).layouts.map(l=>l.short)).toEqual(['ES']);
        expect(findSteamLayoutSource([{le:realAll()}])!.all()).toBe(entries);
    });
    it('never uses an export that changes the layout',()=>{
        const setter=vi.fn(()=>entries);
        const setFn=fake(setter,'(e) => { GetKeyboardLayoutSettings(); SetKeyboardLayout(e); selectedLayouts; currentLayout; x.filter(y) }');
        const s=findSteamLayoutSource([{set:setFn}]);
        s?.all();
        expect(setter).not.toHaveBeenCalled();
        expect(s===null||s.all()===null).toBe(true);
    });
    it.each([
        ['a writer with an argument','t=>{const s=o.GetKeyboardLayoutSettings();s.currentLayout=t;s.selectedLayouts.filter(x=>x)}'],
        ['a writer without arguments','()=>{const s=o.GetKeyboardLayoutSettings();s.currentLayout=1;s.selectedLayouts.filter(x=>x)}'],
        ['a selected-list writer','()=>{const s=o.GetKeyboardLayoutSettings();s.selectedLayouts=s.selectedLayouts.filter(x=>x)}'],
        ['a saver','()=>{const s=o.GetKeyboardLayoutSettings();s.selectedLayouts.filter(x=>x);o.SaveKeyboardLayouts(s)}'],
        ['an updater','()=>{const s=o.GetKeyboardLayoutSettings();Update(s.selectedLayouts.filter(x=>x))}'],
    ])('never selects or calls %s',(_,text)=>{
        const writer=vi.fn((..._a:unknown[])=>entries);
        const arity=text.startsWith('t=>')?(t:unknown)=>writer(t):()=>writer();
        const s=findSteamLayoutSource([{w:fake(arity,text)}]);
        s?.all();
        expect(writer).not.toHaveBeenCalled();
        expect(s===null||s.all()===null).toBe(true);
    });
    it('does not select an exported function that takes arguments',()=>{
        const takes=vi.fn((_options:unknown)=>entries);
        const s=findSteamLayoutSource([{f:fake(takes,'(e) => GetKeyboardLayoutSettings().selectedLayouts.filter(x => x)')}]);
        s?.all();
        expect(takes).not.toHaveBeenCalled();
        expect(s===null||s.all()===null).toBe(true);
    });
    it('returns null when nothing matches',()=>{
        expect(findSteamLayoutSource([])).toBeNull();
        expect(findSteamLayoutSource([{a:1,b:()=>1}])).toBeNull();
        const noStore=findSteamLayoutSource([{a:allFn()}])!;
        expect(noStore.selected()).toBeNull();
    });
    it('does not call anything while searching',()=>{
        const all=vi.fn(()=>entries);
        findSteamLayoutSource([{a:fake(all,'GetKeyboardLayoutSettings selectedLayouts .filter(')}]);
        expect(all).not.toHaveBeenCalled();
    });
});
