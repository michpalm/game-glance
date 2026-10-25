// Validate the installed card transition in live Steam CEF using the current hero-art mode.
// Restores the viewport, route and Clean preference in finally. --normal checks both normal cards and Back navigation.
// Usage: node scripts/cef-clean-transition-matrix.mjs [output-directory] [--normal] [--restore-fitted]
import fs from 'node:fs';
const normalOnly=process.argv.includes('--normal');
const pagePanel=normalOnly?'.gg-cards':'.gg-clean-info';
const movingPanel=normalOnly?'.gh-normal-cards':'.gh-clean-info';
const out=process.argv[2]??'out/clean-transition-matrix'; fs.mkdirSync(out,{recursive:true});
const base=process.env.CEF_URL??'http://127.0.0.1:18080';
const targets=await(await fetch(base+'/json')).json();
async function connect(t){
 if(!t)throw Error('Required Steam CEF target missing');
 const ws=new WebSocket(t.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/,base.replace(/^http/,'ws')));
 await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true})});
 let seq=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}});
 return {ws,send:(method,params={})=>new Promise((r,j)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);j(Error('CEF timeout: '+method))},15000);pending.set(id,m=>{clearTimeout(timer);m.error?j(Error(JSON.stringify(m.error))):r(m.result)});ws.send(JSON.stringify({id,method,params}))})};
}
const main=await connect(targets.find(t=>/Big Picture/.test(t.title))),shared=await connect(targets.find(t=>t.title==='SharedJSContext'));
async function evaluate(expression){const r=await shared.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails).slice(0,700));return r.result.value}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const matrix=[['16-9',1920,1080],['16-10',1280,800],['3-2',1620,1080],['4-3',1440,1080],['21-9',1920,823],['32-9',1920,540],['square',1080,1080],['compact-16-9',828,466]];
const results=[];let originalRoute,game;
const snapshot=`(()=>{const s=SteamUIStore.GetFocusedWindowInstance(),w=s.BrowserWindow,d=w.document;const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};const p=d.querySelector('${pagePanel}');return {route:s.m_history.location.pathname,viewport:[w.visualViewport.width,w.visualViewport.height,w.devicePixelRatio],panel:box(p),pill:box(d.querySelector('.gg-pill')),text:p?.textContent,panels:[...d.querySelectorAll('.gg-cards > .gg-card')].map(box),opening:!!d.querySelector('[data-gh-opening]'),bridge:!!d.querySelector('.gh-bridge'),home:!!d.querySelector('.gh-root')}})()`;
async function shot(name){const r=await main.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(out+'/'+name+'.png',Buffer.from(r.data,'base64'))}
try{
 originalRoute=await evaluate('SteamUIStore.GetFocusedWindowInstance().m_history.location.pathname');
 await evaluate(`(()=>{const internals=SP_REACT.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,old=internals.H;let tree;try{internals.H={useSyncExternalStore:(_,get)=>get(),useMemo:f=>f(),useState:v=>[typeof v==='function'?v():v,()=>{}],useEffect:()=>{},useRef:v=>({current:v}),useCallback:f=>f};tree=DeckyPluginLoader.plugins.find(p=>p.name==='Game Glance').content.type()}finally{internals.H=old}const controls={};const walk=n=>{if(!n||typeof n!=='object')return;if(n.props?.label&&n.props.onChange)controls[n.props.label]=n.props;for(const c of [n.props?.children].flat(Infinity))walk(c)};walk(tree);if(!controls['Clean look'])throw Error('Clean setting handler missing');window.__ggMatrixControls={control:controls['Clean look'],original:controls['Clean look'].checked};return true})()`);
 await evaluate(`window.__ggMatrixControls.control.onChange(${!normalOnly})`);await sleep(500);

 for(const dpr of [1,1.28])for(const [shape,width,height]of matrix){
  const name=shape+'-dpr'+dpr;
  await main.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile:false});
  await evaluate(`SteamUIStore.GetFocusedWindowInstance().m_history.push('/library/home')`);await sleep(1500);
  await evaluate(`(()=>{const w=SteamUIStore.GetFocusedWindowInstance().BrowserWindow,d=w.document;if(window.__ggMatrix)throw Error('Previous probe remains');const state={running:true,copy:null,rows:[],overlap:[],fontErrors:[]};window.__ggMatrix=state;const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};const step=()=>{if(!state.running)return;const moving=d.querySelector('.gh-root[data-gh-normal] .gh-normal-cards');if(moving){const unit=Number(w.getComputedStyle(moving).getPropertyValue('--gho-x-d'));for(const [selector,size]of [['.gh-normal-label',11],['.gh-normal-value',30]])for(const e of moving.querySelectorAll(selector))state.fontErrors.push(Math.abs(parseFloat(w.getComputedStyle(e).fontSize)-unit*size));}const b=d.querySelector('.gh-bridge'),p=d.querySelector('${pagePanel}');if(b){state.copy=b.parentElement.cloneNode(true);const c=b.querySelector('${movingPanel}');if(c&&p)state.rows.push({copy:rect(c),page:rect(p)});}const home=d.querySelector('.gh-root:not(.gh-bridge)'),a=home?.querySelector('.gh-source'),z=home?.querySelector('.gh-x-pill');if(a&&z&&Number(w.getComputedStyle(a).opacity)>.1&&Number(w.getComputedStyle(a).opacity)<.9&&Number(w.getComputedStyle(z.parentElement).opacity)>.1)state.overlap.push({a:rect(a),b:rect(z)});w.requestAnimationFrame(step)};w.requestAnimationFrame(step);const info=d.querySelector('.gh-actions [data-action=info]');if(!info)throw Error('Home Info action missing');info.click();return true})()`);
  const started=Date.now();let state;
  do{await sleep(150);state=await evaluate(snapshot)}while((!state.panel||state.opening||state.bridge)&&Date.now()-started<7000);
  if(!state.panel||state.opening||state.bridge)throw Error('Transition did not settle: '+name);
  if(game&&state.route!==game)throw Error('Game changed during the matrix: '+state.route);game=state.route;
  await shot(name+'-page');
  const probe=await evaluate(`(()=>{const s=window.__ggMatrix;s.running=false;const d=SteamUIStore.GetFocusedWindowInstance().BrowserWindow.document;if(!s.copy)throw Error('No bridge captured');s.copy.style.opacity='1';s.copy.style.transition='none';d.body.appendChild(s.copy);const p=s.copy.querySelector('${movingPanel}');if(!p)throw Error('No shared moving card');const r=p.getBoundingClientRect();return {rows:s.rows,overlap:s.overlap,fontErrors:s.fontErrors,panels:[...p.children].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}),rect:[r.x,r.y,r.width,r.height],text:p.textContent}})()`);
  await sleep(80);await shot(name+'-bridge');
  await evaluate('(()=>{window.__ggMatrix.copy.remove();delete window.__ggMatrix;return true})()');
  const error=probe.rect.map((v,i)=>v-state.panel[i]);
  const cardErrors=normalOnly?probe.panels.map((b,j)=>b.map((v,i)=>v-state.panels[j][i])):[];
  const fontError=Math.max(0,...probe.fontErrors);
  const inside=b=>b&&b[0]>=-1&&b[1]>=-1&&b[0]+b[2]<=state.viewport[0]+1&&b[1]+b[3]<=state.viewport[1]+1;
  const overlapError=Math.max(0,...probe.overlap.map(p=>Math.abs(p.a[1]-p.b[1])));
  let returnedHome=true;if(normalOnly){await evaluate('FocusNavController.DispatchVirtualButtonClick(2)');await sleep(1200);const returned=await evaluate(snapshot);returnedHome=returned.home&&!returned.opening&&!returned.bridge;}
  const ok=returnedHome&&(!normalOnly||(probe.fontErrors.length>0&&fontError<.005&&cardErrors.length===2&&cardErrors.flat().every(e=>Math.abs(e)<.1)))&&error.every(e=>Math.abs(e)<.1)&&probe.text===state.text&&inside(state.panel)&&inside(state.pill)&&overlapError<.2&&probe.rows.length>0;
  const result={name,requested:[width,height,dpr],...state,returnedHome,copy:probe.rect,boundsError:error,cardErrors,fontError,fontSamples:probe.fontErrors.length,overlapError,overlapSamples:probe.overlap.length,bridgeSamples:probe.rows.length,settledMs:Date.now()-started,ok};
  results.push(result);fs.writeFileSync(out+'/metrics.json',JSON.stringify(results,null,2));console.log(name,ok?'PASS':'FAIL',JSON.stringify({viewport:state.viewport,error,overlapError}));
 }
}finally{
 try{await evaluate('(()=>{const s=window.__ggMatrix;if(s){s.running=false;s.copy?.remove();delete window.__ggMatrix}return true})()')}catch(e){console.error('Probe cleanup:',e.message)}
 if(process.argv.includes('--restore-fitted'))await main.send('Emulation.setDeviceMetricsOverride',{width:1500,height:643,deviceScaleFactor:1.28,mobile:false,scale:1,screenWidth:1500,screenHeight:844,positionX:0,positionY:100});
 else await main.send('Emulation.clearDeviceMetricsOverride');
 try{await evaluate('(async()=>{const s=window.__ggMatrixControls;if(s){await s.control.onChange(s.original);delete window.__ggMatrixControls}return true})()')}catch(e){console.error('Settings restore:',e.message)}
 if(originalRoute)await evaluate(`SteamUIStore.GetFocusedWindowInstance().m_history.push(${JSON.stringify(originalRoute)})`);
 fs.writeFileSync(out+'/metrics.json',JSON.stringify(results,null,2));main.ws.close();shared.ws.close();
}
if(results.some(r=>!r.ok)||results.length!==16)process.exitCode=1;
