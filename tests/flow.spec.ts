import { expect, test } from "@playwright/test";
import {
  createContactQueryLead,
  createPricingQueryLead,
  createComplianceTestLead,
  enterLeadPage,
  checkLeadHistory,
  updateFollowup,
  updateCallback,
  changeStatus,
  createPortalLead,
} from "../scripts/leadflow";
import {
  createPortalBusiness,
  createQuoteInvoice,
  enterBusinessPage,
  quoteToInvoice,
  verifyInvoicePay,
  verifyQuoteCreation,
} from "../scripts/businessflow";
import { getUsername, logIn } from "../utils/helpers";
import { trueFalse } from "../utils/generators";
import { verifyClientCreation } from "../scripts/clientflow";

test.describe("Create Leads from Website", () => {
  test("Contact lead", async ({ page }) => {
    const data = await createContactQueryLead(page);
    await logIn(page);
    await enterLeadPage(page, data);
    await checkLeadHistory(page, "create");
  });

  test("Pricing lead", async ({ page, browser }) => {
    const data = await createPricingQueryLead(page, browser);
    await logIn(page);
    await enterLeadPage(page, data.data);
    await checkLeadHistory(page, "create");
  });

  test("Compliance lead", async ({ page, browser }) => {
    const data = await createComplianceTestLead(page, browser);
    await logIn(page);
    await enterLeadPage(page, data);
    await checkLeadHistory(page, "create");
  });
});

test.describe("Company creation from Lead", () => {
  test.beforeEach(async ({ page }) => {
    await logIn(page);
  });

  test("Quote Invoice Creation", async ({ page, browser }) => {
    test.setTimeout(100_000);

    const leadData = await createPortalLead(page);
    await enterLeadPage(page, leadData);
    await checkLeadHistory(page, "create");

    const company = await changeStatus(page, "business");
    await enterBusinessPage(page, company);
    // creates quote
    const data = await createQuoteInvoice(page, "Create", true);
    await verifyQuoteCreation(page, "Create", data);

    const username = getUsername(leadData);

    await quoteToInvoice(page, "Create", data, username, browser);
    const makePayment = trueFalse();
    await verifyInvoicePay(
      page,
      "Create",
      { ...data, date: new Date().toLocaleDateString("en-GB") },
      browser,
      username,
      trueFalse(),
      makePayment,
    );
    if (makePayment) {
      await verifyClientCreation(page, company);
    }
  });

  test("Direct Invoice Creation", async ({ page, browser }) => {
    test.setTimeout(100_000);

    const leadData = await createPortalLead(page);
    await enterLeadPage(page, leadData);
    await checkLeadHistory(page, "create");

    const company = await changeStatus(page, "business");
    await enterBusinessPage(page, company);
    // creates invoice
    const data = await createQuoteInvoice(page, "Create", false);

    const makePayment = trueFalse();
    await verifyInvoicePay(
      page,
      "Create",
      data,
      browser,
      getUsername(leadData),
      trueFalse(),
      makePayment,
    );
    if (makePayment) {
      await verifyClientCreation(page, company);
    }
  });
});

test.describe("Portal Business Creation", () => {
  test.beforeEach(async ({ page }) => {
    await logIn(page);
  });

  test("Create Portal Business", async ({ page }) => {
    test.setTimeout(100_000);

    const company = await createPortalBusiness(page);
    await enterBusinessPage(page, company);

    await expect(
      page.getByText("Business Created from Company House:"),
    ).toBeVisible();
    await expect(page.getByText(`- Company Number: ${company}`)).toBeVisible();
  });
});
