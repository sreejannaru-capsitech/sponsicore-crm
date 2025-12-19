import { Page } from "@playwright/test";

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
