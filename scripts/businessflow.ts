import { faker } from "@faker-js/faker";
import { Browser, expect, Page } from "@playwright/test";
import {
  generateContactFormData,
  getDateDDMMYYYY,
  trueFalse,
} from "../utils/generators";
import {
  businessChoose,
  checkPaymentHistory,
  closeNotification,
  makeStripePayment,
  selectFirstResponse,
  sendPaymentEmail,
  verifyPaymentInfo,
} from "../utils/helpers";
import { acceptQuoteTempmail, openInbox } from "../utils/mail-reader";

export async function enterBusinessPage(page: Page, number: string | number) {
  await page.goto("/business");
  // Check if navigation successfull.
  await expect(page.getByText("Business ID")).toBeVisible();

  const searchInput = page.getByPlaceholder("Search...");
  await searchInput.fill(number.toString());
  await searchInput.press("Enter");

  await page.locator('a[title="Click for business details"]').click();
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

  const amount = faker.number.float({
    min: 1,
    max: 83333.33,
    fractionDigits: 2,
  });

  const data: QuoteData = {
    date: getDateDDMMYYYY("past", 7),
    start: getDateDDMMYYYY("past"),
    end: getDateDDMMYYYY("future"),
    emp: faker.number.int({ min: 10, max: 99999 }),
    amount: amount,
    isDiscount: trueFalse(),
    discount: faker.number.float({ min: 1, max: amount, fractionDigits: 2 }),
    note: faker.lorem.sentence(3),
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

  await page.waitForTimeout(2000); // 2 seconds

  // Add discount
  if (data.isDiscount) {
    await page.locator(`${idStart}-form_isDiscount`).click();
    await page
      .locator(`${idStart}-form_discount`)
      .fill(data.discount.toString());
    await page.locator(`${idStart}-form_discountNote`).fill(data.note);
  }

  await page.getByRole("button", { name: "Save" }).click();

  await expect(
    page.getByText(
      `${isQuote ? "Quote saved" : "Invoice created"} successfully`,
    ),
  ).toBeVisible();
  await closeNotification(page);

  return data;
}

export async function verifyQuoteCreation(
  page: Page,
  quote: QuoteType,
  data: QuoteData,
) {
  await checkPaymentHistory(page, true, data.amount, "create", quote);

  // Go to Quotes tab
  await page.getByRole("tab", { name: "Quotes" }).click();

  const quoteLink = page.locator('span[title="Click for quote details"]');
  // Ensure quote row exists
  await expect(quoteLink.first()).toBeVisible();
  await quoteLink.first().click();

  await verifyPaymentInfo(page, quote, data, true, false);

  // Close the drawer
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "close" })
    .click({ force: true });
}

export async function quoteToInvoice(
  page: Page,
  quote: QuoteType,
  data: QuoteData,
  username: string,
  browser: Browser,
) {
  // Go to Quotes tab
  await page.getByRole("tab", { name: "Quotes" }).click();

  await sendPaymentEmail(page, true);

  await acceptQuoteTempmail(browser, { username }, data, quote);

  await checkPaymentHistory(page, true, data.amount, "accept", quote);
}

export const verifyInvoicePay = async (
  page: Page,
  quote: QuoteType,
  data: QuoteData,
  browser: Browser,
  username: string = "",
  isStripe: boolean = false,
  makePayment: boolean = false,
) => {
  await page.getByRole("tab", { name: "Invoices" }).click();

  const invoiceLink = page.locator('span[title="Click for invoice details"]');
  // Ensure quote row exists
  await expect(invoiceLink.first()).toBeVisible();
  await invoiceLink.first().click();

  await verifyPaymentInfo(page, quote, data, true, true);
  // Close the drawer
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "close" })
    .click({ force: true });

  if (!makePayment) return;

  if (isStripe) {
    await sendPaymentEmail(page, false);

    const inbox = await openInbox(browser, { username });

    try {
      // Open latest email
      await inbox.page.getByText("Complete Your Payment").first().click();

      const [popup] = await Promise.allSettled([
        inbox.context.waitForEvent("page"),
        inbox.page.getByText("Pay Now").click({ force: true }),
      ]);
      const invoicePage =
        popup.status === "fulfilled" ? popup.value : inbox.page;
      await invoicePage.waitForLoadState("domcontentloaded");

      await verifyPaymentInfo(invoicePage, quote, data, false, true);

      await makeStripePayment(invoicePage);
    } finally {
      await inbox.context.close();
    }

    await checkPaymentHistory(
      page,
      false,
      data.amount,
      "stripe",
      quote,
      data.emp,
    );
  } else {
    const trigger = page.locator("span.ant-dropdown-trigger").first();
    await trigger.hover();

    const menu = page.locator(".ant-dropdown-menu:visible");
    await menu.waitFor({ state: "visible" });

    await page
      .getByRole("menuitem", {
        name: "Mark As Paid",
      })
      .click();

    await page.locator("#onb-notify-form_remark").fill("Client gave us coins.");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Marked as paid successfully")).toBeVisible();
    await checkPaymentHistory(
      page,
      false,
      data.amount,
      "marked",
      quote,
      data.emp,
    );
  }
};

export const createPortalBusiness = async (page: Page) => {
  const data = generateContactFormData();

  await page.goto("/business");
  await page.getByRole("button", { name: "Add New" }).click();

  await page.locator("#edit-basic-info_type").click();
  const businessType = faker.helpers.arrayElement([
    "LLP",
    "Limited",
    "Individual",
    "Partnership",
    "Limited Partnership",
  ]);
  await page.getByText(businessType, { exact: true }).click();

  // Select First Response
  await page.locator("#edit-basic-info_firstResponse").click();
  await selectFirstResponse(page);

  await page
    .locator("#edit-basic-info_name_first")
    .fill(data.fullName.split(" ")[0]);
  await page
    .locator("#edit-basic-info_name_last")
    .fill(data.fullName.split(" ")[1]);

  await page.locator("#edit-basic-info_email").fill(data.email);
  await page.locator("input[type='tel']").fill(data.phone);

  const isTrial = trueFalse();
  if (isTrial) {
    await page.locator("input[type='checkbox']").click();
    await page.locator("#edit-basic-info_allowedEmps").fill(data.employees);

    await page.locator(`#edit-basic-info_subscriptionPeriod`).click();
    // Subscription period
    await page
      .locator(`#edit-basic-info_subscriptionPeriod`)
      .fill(getDateDDMMYYYY("past"));
    await page.keyboard.press("Enter");
    await page.keyboard.type(getDateDDMMYYYY("future"));
    await page.keyboard.press("Enter");
  }

  const cmp = await businessChoose(page, "edit-basic-info_companyNumber");

  return { cmp, email: data.email, isTrial };
};

export const chooseBusiness = async (page: Page) => {
  await page.goto("/business?tagStatus=4");
  // Enter the first business
  await page.locator('a[title="Click for business details"]').first().click();

  await page.getByRole("tab", { name: "Profile" }).click();

  const email = await page
    .getByText("Email", { exact: true })
    .locator(
      'xpath=ancestor::div[contains(@class,"ant-form-item-row")]//span[contains(text(),"@")]',
    )
    .innerText();

  const companyNo = (await page
    .getByRole("link", { name: "Click for company details" })
    .getAttribute("href"))!
    .split("/")
    .pop();

  return { cmp: companyNo, email };
};
