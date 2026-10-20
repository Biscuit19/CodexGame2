import type { Page } from "@playwright/test";
/** Custom test loadouts may deliberately omit supplies. Explicitly accept the advisory. */
export async function acceptPreflightIfPresent(page: Page) {
  const proceed = page.getByRole("button", { name: "继续前往", exact: true });
  if (await proceed.isVisible()) await proceed.click();
}
