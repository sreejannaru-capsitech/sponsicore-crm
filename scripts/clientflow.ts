import { expect, Page } from "@playwright/test";
import { enterBusinessPage } from "./businessflow";
import { faker } from "@faker-js/faker";
import { loginClient } from "../utils/helpers";
import { getDateDDMMYYYY } from "../utils/generators";

export const openClientPage = async (page: Page, cmp: string) => {
  await enterBusinessPage(page, cmp);

  const clientLink = page.locator('a[title="Click for client details"]');

  await expect(clientLink.first()).toBeVisible();

  // Wait for the new tab AND click at the same time
  const [newPage] = await Promise.all([
    page.context().waitForEvent("page"),
    clientLink.first().click(),
  ]);
  await newPage.waitForLoadState("domcontentloaded");
  return newPage;
};

export const verifyClientStatus = async (
  page: Page,
  cmp: string,
  status:
    | "Active"
    | "Inactive"
    | "Overdue"
    | "Expires-Today"
    | "Not-Started" = "Active",
) => {
  const newPage = await openClientPage(page, cmp);

  // Go to the Subscription tab
  await newPage.getByRole("tab", { name: "Subscription" }).click();

  await expect(
    newPage.locator("span.ant-tag", {
      hasText: status,
    }),
  ).toBeVisible();

  return newPage;
};

export const editClientSubscription = async (
  page: Page,
  useremail: string,
  setOverdue: boolean,
) => {
  // Go to the Subscription tab
  await page.getByRole("tab", { name: "Subscription" }).click();

  await page.locator('button[title="Edit"]').click();

  // const allowedEmployees = page
  //   .locator('span', { hasText: 'Allowed Employees' })
  //   .locator('xpath=../../div[2]//span');

  // const countText = await allowedEmployees.textContent();
  // const count = Number(countText?.trim());

  const emp_no = faker.number.int({ min: 10, max: 100 }).toString();
  await page.locator("#update-subscription-form_allowedEmps").fill(emp_no);

  await page.locator("#update-subscription-form_subscriptionPeriod").click();
  // Subscription period
  await page
    .locator("#update-subscription-form_subscriptionPeriod")
    .fill(setOverdue ? "01/01/1999" : getDateDDMMYYYY("past"));
  await page.keyboard.press("Enter");
  for (let it = 0; it < 10; it++) {
    await page.keyboard.press("Backspace");
  }
  await page.keyboard.type(
    setOverdue ? "01/01/2000" : getDateDDMMYYYY("future", 70),
  );
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByText("Subscription details updated successfully"),
  ).toBeVisible();

  await expect(
    page.locator("span.ant-tag", {
      hasText: setOverdue ? "Overdue" : "Active",
    }),
  ).toBeVisible();

  if (setOverdue) {
    const segmented = page.locator(".ant-segmented-group");
    await segmented
      .getByText(setOverdue ? "Inactive" : "Active", { exact: true })
      .click();

    await page.getByRole("button", { name: "Yes" }).click();
    await expect(
      page.getByText("Client status updated successfully"),
    ).toBeVisible();
  }

  await loginClient(page, useremail, "welcome", !setOverdue);
};
