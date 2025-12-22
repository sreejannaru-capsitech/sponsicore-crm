import { faker } from "@faker-js/faker";
import { expect, Page } from "@playwright/test";
import { getDateDDMMYYYY } from "../utils/generators";

type QuoteData = {
  date: string;
  start: string;
  end: string;
  emp: number;
  amount: number;
};

export async function enterBusinessPage(page: Page, number: string | number) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(process.env.ADMIN_USERNAME);
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.locator("//span[normalize-space()='Login']").click(),
  ]);

  await page.goto("/business");
  // Check if navigation successfull.
  await expect(page.getByText("Business ID")).toBeVisible();

  const searchInput = page.getByPlaceholder("Search...");
  await searchInput.fill(number.toString());
  await searchInput.press("Enter");

  await page.locator('a[title="Click for business details"]').click();
  await expect(page.getByText("Meetings")).toBeVisible();
}

export async function createQuote(
  page: Page,
  quote: "Create" | "Renew" | "Activate" | "Expand",
) {
  // Go to Quotes tab
  await page.getByRole("tab", { name: "Quotes" }).click();

  await page.getByRole("button", { name: "Add New" }).click();
  await page.locator("#esit-quote-form_planType").click();
  if (quote == "Create") {
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("ArrowDown");
    }
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
  } else if (quote == "Activate") {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
  } else if (quote == "Renew") {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
  } else if (quote == "Expand") {
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("ArrowDown");
    }
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
  }

  const data: QuoteData = {
    date: getDateDDMMYYYY("past", 7),
    start: getDateDDMMYYYY("past"),
    end: getDateDDMMYYYY("future"),
    emp: faker.number.int({ min: 10, max: 99999 }),
    amount: faker.number.float({ min: 1, max: 83333.33, fractionDigits: 2 }),
  };

  if (quote !== "Expand") {
    await page.locator("#esit-quote-form_subscriptionPeriod").click();
    // Subscription period
    await page.locator("#esit-quote-form_subscriptionPeriod").fill(data.start);
    await page.keyboard.press("Enter");
    await page.keyboard.type(data.end);
    await page.keyboard.press("Enter");
  }

  await page.locator("#esit-quote-form_empCount").fill(data.emp.toString());
  await page.locator("#esit-quote-form_amount").fill(data.amount.toString());

  await page.locator("#esit-quote-form_date").click();
  await page.locator("#esit-quote-form_date").fill(data.date);
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Quote saved successfully")).toBeVisible();
  return data;
}
