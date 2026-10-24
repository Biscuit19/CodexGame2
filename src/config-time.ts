/** Explicit Shanghai timestamp, including milliseconds, prevents confusing exports. */
export function timestampSuffix(now = new Date()) {
  const local = new Date(now.getTime() + 8 * 3600_000).toISOString();
  return (
    local.slice(0, 10).replaceAll("-", "") +
    "T" +
    local.slice(11, 23).replaceAll(":", "").replace(".", "_") +
    "+0800"
  );
}
