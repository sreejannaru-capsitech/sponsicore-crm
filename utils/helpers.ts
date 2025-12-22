import { Page } from "@playwright/test";

export async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(process.env.ADMIN_USERNAME);
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.locator("//span[normalize-space()='Login']").click(),
  ]);
}

export async function businessAlreadyExists(page: Page): Promise<boolean> {
  try {
    await page
      .locator(".ant-notification-notice-description", {
        hasText: "Business already exists",
      })
      .waitFor({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
