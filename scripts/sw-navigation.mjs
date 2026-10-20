// Keep each standalone page's offline HTML separate from the game entry.
export function navigationCacheKey(requestURL) {
  const url = new URL(requestURL);
  url.search = "";
  if (url.pathname.endsWith("/")) url.pathname += "index.html";
  return url.href;
}
