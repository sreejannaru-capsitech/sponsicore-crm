import { expect, test } from "@playwright/test";
import {
  chooseBusiness,
  createPortalBusiness,
  createQuoteInvoice,
  enterBusinessPage,
  quoteToInvoice,
  verifyInvoicePay,
  verifyQuoteCreation,
} from "../scripts/businessflow";
import {
  editClientSubscription,
  openClientPage,
  verifyClientStatus,
} from "../scripts/clientflow";
import {
  changeStatus,
  checkLeadHistory,
  createComplianceTestLead,
  createContactQueryLead,
  createPortalLead,
  createPricingQueryLead,
  enterLeadPage,
} from "../scripts/leadflow";
import { trueFalse } from "../utils/generators";
import { getUsername, logIn, loginClient } from "../utils/helpers";

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
      await verifyClientStatus(page, company);
      await loginClient(page, leadData.email, "welcome", true);
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
      await verifyClientStatus(page, company);
      await loginClient(page, leadData.email, "welcome", true);
    }
  });
});

test.describe("Portal Business Creation", () => {
  test.beforeEach(async ({ page }) => {
    await logIn(page);
  });

  test("Create Portal Business", async ({ page, browser }) => {
    test.setTimeout(100_000);

    const { cmp, email, isTrial } = await createPortalBusiness(page);

    await enterBusinessPage(page, cmp);

    await expect(page.getByText("Business Created:")).toBeVisible();
    await expect(page.getByText(`- Company Number: ${cmp}`)).toBeVisible();
    await expect(page.getByText(`- Email: ${email}`)).toBeVisible();

    if (!isTrial) {
      // creates invoice
      const data = await createQuoteInvoice(page, "Create", false);
      await verifyInvoicePay(
        page,
        "Create",
        data,
        browser,
        email.split("@")[0],
        trueFalse(),
        true,
      );
    }
    const clientPage = await openClientPage(page, cmp);
    await loginClient(clientPage, email, "welcome", true);
  });
});

test.describe("Subscription Status Test", () => {
  test.beforeEach(async ({ page }) => {
    await logIn(page);
  });

  test("Edit Subscription Status", async ({ page }) => {
    test.setTimeout(100_000);
    const { cmp, email } = await chooseBusiness(page);
    const clientPage = await openClientPage(page, cmp);
    await editClientSubscription(clientPage, email, true);
    await editClientSubscription(clientPage, email, false);
  });
});
