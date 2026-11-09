const ts=await (await fetch((process.argv[2]||'http://127.0.0.1:18080')+'/json')).json();
const t=ts.find(t=>t.title===('SharedJSContext'));if(!t)throw Error('Steam context unavailable');
const ws=new WebSocket(t.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/,(process.argv[2]||'http://127.0.0.1:18080').replace(/^http/,'ws')));
await new Promise((a,b)=>{ws.onopen=a;ws.onerror=b});
ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:`(()=>({ready:appStore.m_bIsInitialized,libraryCount:collectionStore.allAppsCollection.allApps.filter(a=>a.BIsOwned()).length,hiddenPredicate:typeof collectionStore.BIsHidden,historyListener:typeof SteamUIStore.WindowStore.GamepadUIMainWindowInstance.History.listen}))()`,returnByValue:true,awaitPromise:true}}));
const r=await new Promise((a,b)=>{const timer=setTimeout(()=>b(Error('timeout')),10000);ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id===1){clearTimeout(timer);a(m)}}});
console.log(JSON.stringify(r.result?.result?.value??r));ws.close();
