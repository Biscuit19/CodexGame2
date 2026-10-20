import { describe, it, expect } from "vitest";
import { navigationCacheKey } from "../../scripts/sw-navigation.mjs";
describe("独立试听页离线HTML隔离", () => {
  it("预览目录与完整index.html共享自己的缓存，不覆盖游戏首页", () => {
    const root = "https://biscuit19.github.io/CodexGame2/";
    expect(navigationCacheKey(root)).toBe(root + "index.html");
    expect(navigationCacheKey(root + "audio-review/")).toBe(
      root + "audio-review/index.html",
    );
    expect(navigationCacheKey(root + "audio-review/index.html")).toBe(
      root + "audio-review/index.html",
    );
    expect(navigationCacheKey(root + "audio-review/")).not.toBe(
      navigationCacheKey(root),
    );
  });
  it("导航查询参数不会制造重复首页条目，也不会把预览内容写回根目录", () => {
    const root = "https://biscuit19.github.io/CodexGame2/";
    expect(navigationCacheKey(root + "?revision=2")).toBe(root + "index.html");
    expect(navigationCacheKey(root + "audio-review/?revision=2")).toBe(
      root + "audio-review/index.html",
    );
  });
});
