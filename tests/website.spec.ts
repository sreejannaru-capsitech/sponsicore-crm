import { test } from "@playwright/test";
import {
  createContactQueryLead,
  createPricingQueryLead,
  createComplianceTestLead,
} from "../scripts/leadflow";

test.describe("Website Lead Creation", () => {
  test("Contact lead", async ({ page }) => {
    const data = await createContactQueryLead(page);
  });

  test("Pricing lead", async ({ page, browser }) => {
    const data = await createPricingQueryLead(page, browser);
  });

  test("Compliance lead", async ({ page, browser }) => {
    const data = await createComplianceTestLead(page, browser);
  });
});
