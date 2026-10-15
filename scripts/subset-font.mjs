// Optional asset-authoring tool; the generated WOFF files are checked in.
// Requires the system Noto CJK font package and fonttools (pyftsubset).
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const sources = await readdir("src");
const text = (
  await Promise.all(
    sources
      .filter((f) => /\.(ts|css)$/.test(f))
      .map((f) => readFile(`src/${f}`, "utf8")),
  )
).join("");
const glyphs = Array.from(
  new Set(
    text +
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789，。！？：；（）【】《》“”‘’、…—·◇◈✓↗→×÷−% /",
  ),
).join("");
await writeFile("/tmp/tricat-font-glyphs.txt", glyphs);
await mkdir("src/assets/fonts", { recursive: true });
for (const weight of ["Regular", "Bold"]) {
  const r = spawnSync("pyftsubset", [
    `/usr/share/fonts/opentype/noto/NotoSansCJK-${weight}.ttc`,
    "--font-number=2",
    "--text-file=/tmp/tricat-font-glyphs.txt",
    `--output-file=src/assets/fonts/tricat-${weight.toLowerCase()}.woff`,
    "--flavor=woff",
    "--layout-features=*",
    "--no-hinting",
  ]);
  if (r.status !== 0) throw Error(r.stderr.toString());
}
