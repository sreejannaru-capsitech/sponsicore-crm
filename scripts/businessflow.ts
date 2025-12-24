import { faker } from "@faker-js/faker";
import { expect, Page } from "@playwright/test";
import {
  formatCurrencyGBP,
  getDateDDMMYYYY,
  slashToHyphen,
} from "../utils/generators";
import { logIn } from "../utils/helpers";
import { acceptQuoteTempmail } from "../utils/mail-reader";

type QuoteData = {
  date: string;
  start: string;
  end: string;
  emp: number;
  amount: number;
};

export type QuoteType = "Create" | "Renew" | "Activate" | "Expand";

export async function enterBusinessPage(page: Page, number: string | number) {
  await logIn(page);

  await page.goto("/business");
  // Check if navigation successfull.
  await expect(page.getByText("Business ID")).toBeVisible();

  const searchInput = page.getByPlaceholder("Search...");
  await searchInput.fill(number.toString());
  await searchInput.press("Enter");

  await page.locator('a[title="Click for business details"]').click();
  await expect(page.getByText("Meetings")).toBeVisible();
}

export async function createQuoteInvoice(
  page: Page,
  quote: QuoteType,
  isQuote: boolean,
  createExists: boolean = true,
) {
  // Go to the tab
  await page
    .getByRole("tab", { name: isQuote ? "Quotes" : "Invoices" })
    .click();

  const idStart = isQuote ? "#esit-quote" : "#update-subscription";

  await page.getByRole("button", { name: "Add New" }).click();
  await page.locator(`${idStart}-form_planType`).click();

  const defaultMap: Record<QuoteType, number> = {
    Activate: 1,
    Renew: 2,
    Expand: 3,
    Create: 4,
  };
  const noCreateMap: Partial<Record<QuoteType, number>> = {
    Renew: 1,
    Expand: 2,
    Activate: 3,
  };

  const map = createExists ? defaultMap : noCreateMap;
  const steps = map[quote];

  if (steps === undefined) {
    throw new Error(
      `Quote option "${quote}" not available when createExists=${createExists}`,
    );
  }

  for (let i = 0; i < steps; i++) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");

  const data: QuoteData = {
    date: getDateDDMMYYYY("past", 7),
    start: getDateDDMMYYYY("past"),
    end: getDateDDMMYYYY("future"),
    emp: faker.number.int({ min: 10, max: 99999 }),
    amount: faker.number.float({ min: 1, max: 83333.33, fractionDigits: 2 }),
  };

  if (quote !== "Expand") {
    await page.locator(`${idStart}-form_subscriptionPeriod`).click();
    // Subscription period
    await page.locator(`${idStart}-form_subscriptionPeriod`).fill(data.start);
    await page.keyboard.press("Enter");
    await page.keyboard.type(data.end);
    await page.keyboard.press("Enter");
  }

  await page.locator(`${idStart}-form_empCount`).fill(data.emp.toString());
  await page.locator(`${idStart}-form_amount`).fill(data.amount.toString());

  await page.locator(`${idStart}-form_date`).click();
  await page.locator(`${idStart}-form_date`).fill(data.date);
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByText(
      `${isQuote ? "Quote saved" : "Invoice created"} successfully`,
    ),
  ).toBeVisible();
  return data;
}

export async function verifyQuoteCreation(
  page: Page,
  quote: "Create" | "Renew" | "Activate" | "Expand",
  data: QuoteData,
) {
  // Calculations
  const subTotal = formatCurrencyGBP(data.amount);
  const vat = formatCurrencyGBP(data.amount * 0.2);
  const total = formatCurrencyGBP(data.amount * 0.2 + data.amount);

  // Go to History tab
  await page.getByRole("tab", { name: "History" }).click();

  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("Quote Created").first()).toBeVisible();
  await expect(page.getByText(total).first()).toBeVisible();

  // Go to Quotes tab
  await page.getByRole("tab", { name: "Quotes" }).click();

  const quoteLink = page.locator('span[title="Click for quote details"]');
  // Ensure quote row exists
  await expect(quoteLink.first()).toBeVisible();
  await quoteLink.first().click();

  // Quote date check
  await expect(page.getByText(slashToHyphen(data.date))).toBeVisible();

  const subscription = ` (${slashToHyphen(data.start)} - ${slashToHyphen(data.end)})`;

  if (quote == "Expand") {
    await expect(page.getByText(quote + " Team" + subscription)).toBeVisible();
  } else if (quote == "Renew") {
    await expect(
      page.getByText(quote + " Subscription" + subscription),
    ).toBeVisible();
  } else {
    await expect(
      page.getByText(quote + " Company" + subscription),
    ).toBeVisible();
  }
  // No. of employee
  await expect(page.getByText(data.emp.toString())).toBeVisible();
  // Money check
  await expect(page.getByText(subTotal).first()).toBeVisible();
  await expect(page.getByText(vat).first()).toBeVisible();
  await expect(page.getByText(total).first()).toBeVisible();
}
