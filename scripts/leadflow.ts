import { expect, Page, Browser } from "@playwright/test";
import { faker } from "@faker-js/faker";
import {
  ContactFormData,
  formatDateTime,
  generateContactFormData,
  generateUkCompanyNumber,
} from "../utils/generators";
import { readOtpFromTempmail } from "../utils/mail-reader";
import { businessAlreadyExists } from "../utils/helpers";

const pageURL = process.env.WEBSITE_URL;

export async function createContactQueryLead(page: Page) {
  await page.goto(`${pageURL}/contact`);

  const data = generateContactFormData();

  await page.locator("#name").fill(data.fullName);
  await page.locator("#company").fill(data.company);
  await page.locator("#total_employee").fill(data.employees!);
  await page.locator("#email").fill(data.email);
  await page.locator("input[type='tel']").fill(data.phone);
  await page.locator("#message").fill(data.message);

  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Success")).toBeVisible();

  return data;
}

export async function createPricingQueryLead(page: Page, browser: Browser) {
  await page.goto(pageURL);
  await page.getByRole("button", { name: "Get Started" }).click();

  const data = generateContactFormData();

  await page.locator("#full_name").fill(data.fullName);
  await page.locator("#company_name").fill(data.company);
  await page.locator("#email").fill(data.email);
  await page.locator("input[type='tel']").fill(data.phone);
  await page.locator("#message").fill(data.message);

  await page.getByRole("button", { name: "Submit" }).click();

  const verifyButton = page.getByRole("button", { name: "Verify" });
  await expect(verifyButton).toBeVisible();

  const otp = await readOtpFromTempmail(browser, {
    username: data.fullName.split(" ")[0] + ".official",
  });

  await page.locator("input[name='otp']").fill(otp);
  await verifyButton.click();

  await expect(page.getByText("Sponsicore Pricing Plans")).toBeVisible();

  // Random plan decision
  if (faker.datatype.boolean()) {
    await page.getByText("Proceed to Pay").click();
    return { data, plan: "annual" };
  } else {
    await page.getByText("Let us know").click();
    await expect(page.getByText("Thank you for your response")).toBeVisible();
    return { data, plan: "custom" };
  }
}

export async function createComplianceTestLead(page: Page, browser: Browser) {
  const ids = [
    "69038bea19584533a7499102",
    "69048af7f445421540ffe980",
    "690492b4f445421540ffe9b3",
    "690496b9f445421540ffe9c5",
    "69049785f445421540ffe9cb",
    "69049a23f445421540ffe9dd",
    "69049e0df445421540ffe9f2",
    "6904a3645d38f9752e68fc97",
    "6904a4075d38f9752e68fc9b",
    "6904a50a5d38f9752e68fc9e",
    "690839069c16834787b27b4f",
    "6926b281071a64e32132ecaf",
    "6926f37e127b69b41dd809c2",
    "6926f396127b69b41dd809c9",
    "6926f44e127b69b41dd809eb",
    "69280c8898233e759a78f7d5",
    "694141061e55626212850e07",
  ];

  const campaign = faker.helpers.arrayElement(ids);
  await page.goto(`${process.env.PORTAL_URL}/compliance-test/${campaign}`);

  const data = generateContactFormData();

  await page.locator("#login_name").fill(data.fullName);
  await page.locator("#login_email").fill(data.email);
  await page.locator("input[type='tel']").fill(data.phone);
  await page.getByRole("button", { name: "Submit" }).click();

  const otp = await readOtpFromTempmail(browser, {
    username: data.fullName.split(" ")[0] + ".official",
  });

  const digits = otp.split("");
  for (let i = 0; i < digits.length; i++) {
    await page.locator(`#Otp${i + 1}`).fill(digits[i]);
  }

  await page.getByRole("button", { name: "Verify" }).click();

  await expect(page.getByText("Company Information")).toBeVisible();

  await page
    .locator("#survey-questions-form_basicInfoFirst")
    .fill(data.company);

  const totalEmp = faker.number.int({ min: 10, max: 500 });

  await page
    .locator("#survey-questions-form_basicInfoSecond")
    .fill(totalEmp.toString());

  await page
    .locator("#survey-questions-form_basicInfoThird")
    .fill(faker.number.int({ min: 10, max: totalEmp }).toString());

  await page.getByRole("button", { name: "Save & Next" }).click();
  await expect(page.getByText("Questions 1/8")).toBeVisible();

  return data;
}

export async function enterLeadPage(page: Page, data: ContactFormData) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(process.env.ADMIN_USERNAME);
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL("**/dashboard"),
    page.locator("//span[normalize-space()='Login']").click(),
  ]);

  await page.goto("/lead");
  // Check if navigation successfull.
  await expect(page.getByText("Lead ID")).toBeVisible();

  // Find the link to the lead in the row.
  const row = page.getByRole("row", {
    name: data.fullName.split(" ")[0],
  });
  await row.locator("a").first().click();
}

export async function checkLeadHistory(
  page: Page,
  history:
    | "create"
    | "Designation"
    | "Story"
    | "Follow-Up"
    | "Callback"
    | "Note"
    | "Email",
) {
  // Go to history tab
  await page.getByRole("tab", { name: "History" }).click();

  switch (history) {
    case "create":
      await expect(page.getByText("Lead Created")).toBeVisible();
      break;

    case "Designation":
      await expect(page.getByText(`- ${history}`)).toBeVisible();
      break;

    case "Story":
      await expect(page.getByText(`- ${history}`)).toBeVisible();
      break;

    case "Follow-Up":
      await expect(page.getByText(`- Follow-Up Date`)).toBeVisible();
      break;

    case "Callback":
      await expect(page.getByText(`Callback Added`)).toBeVisible();
      break;

    case "Note":
      await expect(page.getByText(`Note Added`)).toBeVisible();
      break;

    case "Email":
      await expect(page.getByText(`Email Sent`)).toBeVisible();
      break;
  }
}

export async function updateFollowup(page: Page) {
  await page.locator('svg[data-icon="down"]').click();

  const options = [
    "Tomorrow",
    "Later this week",
    "This weekend",
    "Next week",
    "Two week",
  ];

  await page.getByText(faker.helpers.arrayElement(options)).click();
  await page.locator("a.ant-notification-notice-close").click();
  await checkLeadHistory(page, "Follow-Up");
}

export async function updateCallback(page: Page) {
  await page.locator('button[title="Add Callback"]').click();
  const date = formatDateTime();

  await page.locator("#internal-callback_dateTime").click();
  await page.keyboard.type(date);
  await page.keyboard.press("Enter");

  await page.locator("#internal-callback_note").fill(faker.lorem.sentence(10));
  await page.getByRole("button", { name: "Save" }).click();
  await page.locator("a.ant-notification-notice-close").click();
  await checkLeadHistory(page, "Callback");
}

export async function sendEmail(page: Page) {
  await page.locator('button[title="Send Email"]').click();
  await page
    .locator("#compose-email-form_subject")
    .fill(faker.lorem.sentence(5));

  await page.getByRole("button", { name: "Send" }).click();

  await checkLeadHistory(page, "Email");
}

export async function changeStatus(
  page: Page,
  status: "business" | "Lead Lost" | "Not Lead",
) {
  await page.locator('button[title="Change Status"]').click();

  if (status == "business") {
    const select = page.locator("#change-lead-status-form_status");
    await select.click();
    await select.press("Enter");

    let success = false;

    while (!success) {
      const companyNo = generateUkCompanyNumber();

      // Open dropdown
      const b_select = page.locator("#change-lead-status-form_companyNo");
      await b_select.click();
      // Clear previous input (important for AntD)
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Backspace");

      // Type new value
      await page.keyboard.type(companyNo);

      // Locator for option with exact text
      const option = page.getByRole("option", { name: companyNo });
      await page.waitForTimeout(300);

      if ((await option.count()) > 0) {
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");

        // Click Save
        await page.getByRole("button", { name: "Save" }).click();
        // Now check if company is already exists in portal
        if (await businessAlreadyExists(page)) {
          await page.locator("a.ant-notification-notice-close").click();
          continue; // Skip iteration and retry
        }
        success = true;
      } else {
        // Close dropdown before retry
        await page.keyboard.press("Escape");
      }
    }
  }
}
