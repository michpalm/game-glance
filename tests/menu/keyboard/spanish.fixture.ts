// Spanish rgLayout({}) rows as read from Steam on 2026-10-29 (source text decoded).
const special=(key:string,label:string,type:number)=>({key,label,type});
const TAB=special('Tab','#Key_Tab',3),ENTER=special('Enter','#Key_Enter',1),BACKSPACE=special('Backspace','#Key_Backspace',9);
const CAPS=special('CapsLock','#Key_Caps',6),SHIFT_L=special('Shift','#Key_Shift',7),SHIFT_R=special('Shift','#Key_Shift',8);
const dead=(key:string,next:string,combined:string)=>({key,label:key,dead:true,dead_next:next,dead_combined:combined});
const TILDE=dead('~',' aAnNoO','~ãÃñÑõÕ');
const GRAVE=dead('`',' aAeEiIoOuU','`àÀèÈìÌòÒùÙ');
const CIRCUMFLEX=dead('^',' aAeEiIoOuU','^âÂêÊîÎôÔûÛ');
const ACUTE=dead('´',' aAeEiIoOuUyY','´áÁéÉíÍóÓúÚýÝ');
const DIAERESIS=dead('¨',' aAeEiIoOuUy','¨äÄëËïÏöÖüÜÿ');
export const SPANISH_ROWS:unknown[][]=[
    [['º','ª','\\'],['1','!','|'],['2','"','@'],['3','·','#'],['4','$',TILDE],['5','%','€'],['6','&','¬'],['7','/'],['8','('],['9',')'],['0','='],["'",'?'],['¡','¿'],BACKSPACE],
    [TAB,'q','w',['e',null,'€'],'r','t','y','u','i','o','p',[GRAVE,CIRCUMFLEX,'['],['+','*',']'],['ç',null,'}']],
    [CAPS,'a','s','d','f','g','h','j','k','l','ñ',[ACUTE,DIAERESIS,'{'],ENTER],
    [SHIFT_L,['<','>'],'z','x','c','v','b','n','m',[',',';'],['.',':'],['-','_'],SHIFT_R],
    // Bottom row with every option off: Steam leaves undefined holes.
    [special('VKSymbols','#Key_Symbols',4),special('VKEmoji','#Key_Emoji',4),special(' ',' ',10),special('AltGr','#Key_AltGr',4),undefined,undefined,undefined,[special('VKClose','#Key_Close',5),undefined]],
];
