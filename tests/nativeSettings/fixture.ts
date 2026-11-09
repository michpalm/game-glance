import {parseHTML} from 'linkedom';
export function nativePage(content='<div class="DialogSettingsSection"><div class="Panel"><div>Volume</div><div role="slider"></div></div></div>'){
 const {document}=parseHTML(`<html><head></head><body><div class="DialogContent" id="container"><div class="DialogContent_InnerWidth"><div id="layout"><div class="PageListColumn"><div><div role="tab">Audio</div><div role="tab">Storage</div></div></div><div class="DialogContentTransition"><div class="Panel"><div class="DialogContent" id="page"><div class="DialogContent_InnerWidth"><div class="DialogHeader">Audio</div><div class="DialogBody">${content}</div></div></div></div></div></div></div></div></body></html>`);
 return document as unknown as Document;
}
