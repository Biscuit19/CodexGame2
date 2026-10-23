import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { navigationCacheKey } from "./sw-navigation.mjs";
await writeFile(
  "dist/build.json",
  JSON.stringify({
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
  }),
);
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
  (f) =>
    !f.endsWith("/sw.js") &&
    !f.endsWith("/.nojekyll") &&
    // This optional research audition loads on demand. Opening the game must
    // not download its full set of raw recordings and unused candidates.
    !f.includes("/audio-review/actions/") &&
    !f.includes("/audio-review/interactions/") &&
    !f.includes("/audio-review/reload-search-cats/") &&
    !f.includes("/audio-review/shots-music/") &&
    !f.includes("/audio-review/discovery-music/") &&
    !f.includes("/audio-review/commerce/") &&
    !f.includes("/audio-review/soft-clicks/") &&
    !f.includes("/audio-mixer/"),
);
const hash = createHash("sha256");
for (const f of files) hash.update(await readFile(f));
const version = `tricat-${hash.digest("hex").slice(0, 12)}`;
const source = `const navigationCacheKey=${navigationCacheKey.toString()};\nconst CACHE=${JSON.stringify(version)},FILES=${JSON.stringify(files.map((f) => `./${f.slice(5)}`))};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tricat-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-cache'}).then(async r=>{if(r.ok){const copy=r.clone();await(await caches.open(CACHE)).put(navigationCacheKey(e.request.url),copy);}return r;}).catch(()=>caches.match(navigationCacheKey(e.request.url),{ignoreVary:true})));return;}e.respondWith(caches.match(e.request,{ignoreVary:true}).then(hit=>hit||fetch(e.request)));});
`;
await writeFile("dist/sw.js", source);
await writeFile("dist/.nojekyll", "");
console.log(`Offline cache generated: ${version} (${files.length} assets)`);
