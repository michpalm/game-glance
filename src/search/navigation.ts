import type {SearchEnvironment} from './steam';
export function openSearchResult(appId:number,env:SearchEnvironment,signal?:AbortSignal):Promise<'opened'|'failed'> {
 if(!Number.isInteger(appId)||appId<=0||signal?.aborted)return Promise.resolve('failed');
 const path=`/library/app/${appId}`;if(env.route.get()===path)return Promise.resolve('opened');
 return new Promise(resolve=>{
  let done=false,off=()=>{},timer:ReturnType<typeof setTimeout>|undefined;
  const finish=(value:'opened'|'failed')=>{if(done)return;done=true;if(timer)clearTimeout(timer);off();signal?.removeEventListener('abort',abort);resolve(value);};
  const abort=()=>finish('failed'),changed=()=>{if(env.route.get()===path)finish('opened');};
  try{off=env.route.subscribe(changed);signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>finish('failed'),5000);env.navigate(path);changed();}catch{finish('failed');}
 });
}
