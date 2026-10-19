// Deployment smoke check only. Gameplay is covered by selected local tests.
import assert from "node:assert/strict";

const base = new URL(process.argv[2] || "https://biscuit19.github.io/CodexGame2/");
const expected = process.env.EXPECTED_BUILD;
assert(expected, "EXPECTED_BUILD must identify the published commit");
const deadline = Date.now() + 5 * 60_000;

async function get(path, type) {
  const url = new URL(path, base);
  url.searchParams.set("deployment-check", `${expected}-${Date.now()}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  assert(response.ok, `${url.pathname}: HTTP ${response.status}`);
  assert(response.headers.get("content-type")?.includes(type), `${url.pathname}: unexpected content type`);
  return response.text();
}

while (true) {
  try {
    const revision = JSON.parse(await get("build.json", "json"));
    assert.equal(revision.commit, expected, "Pages has not published this revision yet");
    const html = await get("index.html", "text/html");
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map(m => m[1]);
    assert(assets.some(path => path.endsWith(".js")), "Missing application script");
    assert(assets.some(path => path.endsWith(".css")), "Missing stylesheet");
    await Promise.all(assets.map(path => get(path, path.endsWith(".css") ? "text/css" : "javascript")));
    const sw = await get("sw.js", "javascript");
    assert(sw.includes("tricat-"), "Missing generated offline worker");
    console.log(`Published revision ${expected}: entry page, ${assets.length} entry assets and service worker available.`);
    break;
  } catch (error) {
    if (Date.now() >= deadline) throw error;
    console.log(`Waiting for Pages: ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, 10_000));
  }
}
