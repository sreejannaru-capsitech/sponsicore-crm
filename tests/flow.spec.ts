import { test } from "@playwright/test";
import {
  createContactQueryLead,
  createPricingQueryLead,
  createComplianceTestLead,
  enterLeadPage,
  checkLeadHistory,
  updateFollowup,
  updateCallback,
  changeStatus,
} from "../scripts/leadflow";

test.describe("Create and Update Lead", () => {
  test("Contact lead", async ({ page }) => {
    const data = await createContactQueryLead(page);
    await enterLeadPage(page, data);
    await checkLeadHistory(page, "create");

    // await updateFollowup(page);
    // await updateCallback(page);
    await changeStatus(page, "business");
  });

  test("Pricing lead", async ({ page, browser }) => {
    const data = await createPricingQueryLead(page, browser);
    await enterLeadPage(page, data.data);
    await checkLeadHistory(page, "create");

    await updateFollowup(page);
  });

  test("Compliance lead", async ({ page, browser }) => {
    const data = await createComplianceTestLead(page, browser);
    await enterLeadPage(page, data);
    await checkLeadHistory(page, "create");

    await updateFollowup(page);
  });
});
