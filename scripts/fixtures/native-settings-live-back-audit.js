// Evaluate in Steam's SharedJSContext with the Deck awake and side menu closed.
// Native A/B routing only; no setting values or account/library text exported.
(async()=>{
 const w=SteamUIStore.WindowStore.GamepadUIMainWindowInstance,d=w.BrowserWindow.document,v=d.defaultView;
 if(w.MenuStore.IsAnySideMenuVisible())throw Error('Close the side menu before auditing Settings back navigation');
 const results=[];
 for(const [category,settle] of [['audio',700],['display',700],['customization',700],['audio',70]]){
  DFL.Navigation.Navigate('/library/home');await new Promise(r=>setTimeout(r,700));
  DFL.Navigation.Navigate('/settings/'+category);await new Promise(r=>setTimeout(r,settle));
  const outgoing=d.querySelector('[data-gg-settings=container]');if(!outgoing)throw Error('Settings presentation did not mount');
  const rows=[],start=v.performance.now();FocusNavController.DispatchVirtualButtonClick(2);
  await new Promise(resolve=>{function sample(){let opacity=1,e=outgoing;while(e){const s=v.getComputedStyle(e);opacity*=Number(s.opacity);if(s.visibility==='hidden'||s.display==='none')opacity=0;e=e.parentElement;}
   const r=outgoing.getBoundingClientRect(),retained=outgoing.isConnected&&!outgoing.hasAttribute('data-gg-settings');
   rows.push({ms:Math.round(v.performance.now()-start),connected:outgoing.isConnected,retained,guarded:retained&&outgoing.getAttribute('data-gg-settings-retiring')==='true'&&v.getComputedStyle(outgoing).visibility==='hidden',exposed:retained&&opacity>.01&&r.width>0,ghost:!!d.querySelector('[data-gg-settings-transition]')});
   if(v.performance.now()-start<1300)v.requestAnimationFrame(sample);else resolve();}v.requestAnimationFrame(sample);});
  const result={category,earlyExit:settle<100,frames:rows.length,retainedFrames:rows.filter(r=>r.retained).length,guardedFrames:rows.filter(r=>r.guarded).length,exposedNativeFrames:rows.filter(r=>r.exposed).length,nativeUnmountMs:rows.find(r=>!r.connected)?.ms??null,lastGhostMs:rows.filter(r=>r.ghost).at(-1)?.ms??null,home:w.History.location.pathname==='/library/home',leftovers:d.querySelectorAll('[data-gg-settings-retiring],[data-gg-settings-retirement-style],[data-gg-settings-transition],[data-gg-settings-motion-style],[data-gg-settings-motion-underlay]').length};
  if(result.exposedNativeFrames||!result.home||result.leftovers)throw Error('Settings B exit failed '+JSON.stringify(result));results.push(result);
 }
 return results;
})()
