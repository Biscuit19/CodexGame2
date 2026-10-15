import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}
const files = (await walk("dist")).filter(
  (f) => !f.endsWith("/sw.js") && !f.endsWith("/.nojekyll"),
);
const hash = createHash("sha256");
for (const f of files) hash.update(await readFile(f));
const version = `tricat-${hash.digest("hex").slice(0, 12)}`;
const source = `const CACHE=${JSON.stringify(version)},FILES=${JSON.stringify(files.map((f) => `./${f.slice(5)}`))};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tricat-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request,{ignoreVary:true}).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('./index.html',{ignoreVary:true}):Response.error())));});
`;
await writeFile("dist/sw.js", source);
await writeFile("dist/.nojekyll", "");
console.log(`Offline cache generated: ${version} (${files.length} assets)`);
