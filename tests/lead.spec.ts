import { expect, test } from "@playwright/test";
import { faker } from "@faker-js/faker";
import { logIn } from "../utils/helpers";

test.describe("CRM Panel", () => {
  let leadName: string;

  test.beforeEach(async ({ page }) => {
    await logIn(page);
  });

  test("Create Lead", async ({ page }) => {
    await page.goto("/lead");
    // Check if navigation successfull.
    await expect(page.getByText("Lead ID")).toBeVisible();

    await page.getByRole("button", { name: "Add New" }).click();

    // Enter name
    leadName = faker.person.firstName();
    await page.locator("#edit-lead-form_name_first").fill(leadName);

    // Enter email
    await page
      .locator("#edit-lead-form_emailList_0_email")
      .fill(`${leadName}.lead@fexbox.org`);

    // Select a Mode
    await page.locator("#edit-lead-form_mode").click();
    const mode = faker.helpers.arrayElement([
      "Web Contact Query",
      "Web Pricing Query",
      "Compliance Test",
      "Live Chat",
      "Call",
      "Email",
      "Referral",
      "Other",
    ]);
    await page
      .locator(".ant-select-dropdown .ant-select-item-option-content", {
        hasText: mode,
      })
      .click();

    // Select First Response
    await page.locator("#edit-lead-form_firstResponse").click();
    const firstResponse = faker.helpers.arrayElement([
      "Anoushka Mishra",
      "Avik Sain",
      "Debanik Saha",
      "Himanshu Sharma",
      "Lead Manager",
      "Natasha Romanoff",
      "Sreejan Naru",
      "Subhajit Kar",
    ]);

    const dropdown = page
      .locator(".rc-virtual-list")
      .filter({ hasNotText: "Web" });

    // Scroll through the dropdown to find the desired option.
    await dropdown.evaluate(async (el, text) => {
      const container = el.querySelector(
        ".ant-select-dropdown-content, .rc-virtual-list-holder",
      );

      if (!container) return;

      let lastScrollTop = -1;

      while (container.scrollTop !== lastScrollTop) {
        lastScrollTop = container.scrollTop;
        container.scrollTop += 200;
        await new Promise((r) => setTimeout(r, 100));

        const option = Array.from(
          el.querySelectorAll(".ant-select-item-option-content"),
        ).find((n) => n.textContent?.trim() === text);

        if (option) {
          option.scrollIntoView();
          return;
        }
      }
    }, firstResponse);

    await page
      .locator(".ant-select-item-option-content", { hasText: firstResponse })
      .click();

    // Hit Save
    await page.getByRole("button", { name: "Save" }).click();

    // Success message should be visible.
    await expect(page.getByText("Lead saved successfully")).toBeVisible();
  });

  test("Edit Lead", async ({ page }) => {
    await page.goto("/lead");
    // Check if navigation successfull.
    await expect(page.getByText("Lead ID")).toBeVisible();

    // Find the link to the lead in the row.
    const row = page.getByRole("row", { name: leadName });
    await row.locator("a").first().click();

    // Check if navigation successfull.
    await expect(page.getByText("New Lead")).toBeVisible();
  });
});
