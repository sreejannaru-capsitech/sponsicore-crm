import { expect, Page } from "@playwright/test";
import { enterBusinessPage } from "./businessflow";

export const verifyClientCreation = async (page: Page, cmp: string) => {
  await enterBusinessPage(page, cmp);

  const clientLink = page.locator('a[title="Click for client details"]');

  await expect(clientLink.first()).toBeVisible();

  // Wait for the new tab AND click at the same time
  const [newPage] = await Promise.all([
    page.context().waitForEvent("page"),
    clientLink.first().click(),
  ]);
  await newPage.waitForLoadState("domcontentloaded");

  // Go to the Subscription tab
  await newPage.getByRole("tab", { name: "Subscription" }).click();

  await expect(
    newPage.locator("span.ant-tag-success", { hasText: "Active" }),
  ).toBeVisible();
};
