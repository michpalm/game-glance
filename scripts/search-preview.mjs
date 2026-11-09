// Production Search with fabricated library/route/controller adapters; no live Steam calls.
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),repo=resolve(dirname(new URL(import.meta.url).pathname),'..');
const vitePath=resolve(repo,'node_modules/.pnpm/vite@8.3.2/node_modules/vite/dist/node/index.js');
const {createServer}=await import(vitePath);
const root=resolve(repo,'.superpowers/sdd/2026-11-04-library-search/preview');await mkdir(root,{recursive:true});
await writeFile(resolve(root,'index.html'),`<html><head><meta charset="utf-8"><style>body{margin:0;background:#10141c url('/assets/device-frame.png') center/100% 100%;color:white;font-family:Arial,sans-serif;height:100vh}button{font:inherit;color:inherit;cursor:pointer}.DialogButton{font:inherit}.fixture-status{position:fixed;right:18px;top:6px;height:34px;padding:5px 12px;background:transparent;border:none;color:transparent;box-sizing:border-box}button:focus-visible{outline:2px solid white;outline-offset:3px}</style></head><body><div id="app"></div><script type="module" src="/@fs/${repo}/scripts/fixtures/search-preview.tsx"></script></body></html>`);
const server=await createServer({configFile:false,root,publicDir:process.argv[2]?resolve(process.argv[2]):false,resolve:{dedupe:['react','react-dom'],alias:[{find:'@decky/ui',replacement:resolve(repo,'scripts/fixtures/search-decky.tsx')},{find:'@decky/api',replacement:resolve(repo,'scripts/fixtures/search-api.ts')}]},server:{host:'127.0.0.1',port:18404,strictPort:true,fs:{allow:[repo,...process.argv.slice(2).map(p=>resolve(p))]}}});
await server.listen();console.log('Search preview: http://127.0.0.1:18404');
