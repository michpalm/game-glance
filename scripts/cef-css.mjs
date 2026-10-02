// Inject (or clear) a prototype stylesheet into Steam's Game Mode window on the device. Usage: node scripts/cef-css.mjs file.css | --clear
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const arg = process.argv[2];
const css = arg === '--clear' ? '' : readFileSync(arg, 'utf8');
const expr = `(() => { let s = document.getElementById('gg-proto'); if (!s) { s = document.createElement('style'); s.id = 'gg-proto'; } document.body.appendChild(s); s.textContent = ${JSON.stringify(css)}; return 'ok ' + s.textContent.length; })()`;
console.log(execFileSync('node', [new URL('./cef-eval.mjs', import.meta.url).pathname, expr]).toString().trim());
